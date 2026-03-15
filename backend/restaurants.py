"""
Restaurant recommendations chat: protected FastAPI routes that call Gemini.
API key is read from env (GEMINI_API_KEY) and never exposed to the client.
"""
import json
import os
import re
from typing import Any, Dict, List, Optional, Tuple, Set

import httpx
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from auth import extract_token, get_user_id_from_token
from db import supabase
from network_graph import (
    _extract_cuisine_weights,
    _extract_taste_profile,
    _parse_preferences,
)
from routers.restaurants import _infer_cuisine

router = APIRouter()

_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")
_TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"


# --- @mention and group preferences ---

def _extract_mentions(message: str) -> List[str]:
    """Extract @Name tokens from the message (e.g. @Sarah, @Maya Chen)."""
    return re.findall(r"@(\w+(?:\s\w+)?)", message)


def _resolve_mentions_to_group(
    user_id: str, message: str
) -> List[Tuple[str, Dict[str, Any]]]:
    """
    Resolve @mentions in message to (name, preferences) for user + matched friends.
    Returns list of (display_name, preferences_dict). User first, then friends in mention order.
    """
    mentions = _extract_mentions(message)
    if not mentions:
        return []

    profile_result = (
        supabase.table("profiles")
        .select("id,display_name,preferences,friends")
        .eq("id", user_id)
        .execute()
    )
    profile_rows = profile_result.data or []
    profile = profile_rows[0] if profile_rows else None
    if not profile:
        return []

    raw_friends = profile.get("friends") or []
    friend_ids = [str(fid) for fid in raw_friends if str(fid) != user_id]
    friend_ids = list(dict.fromkeys(friend_ids))
    if not friend_ids:
        return []

    friends_result = (
        supabase.table("profiles")
        .select("id,display_name,preferences")
        .in_("id", friend_ids)
        .execute()
    )
    friend_profiles = friends_result.data or []

    # Build display_name -> (id, preferences) for friends
    friend_by_name: Dict[str, Dict[str, Any]] = {}
    for f in friend_profiles:
        display_name = (f.get("display_name") or "").strip()
        if display_name:
            friend_by_name[display_name.lower()] = {
                "id": str(f.get("id")),
                "display_name": display_name,
                "preferences": _parse_preferences(f.get("preferences")),
            }

    # Match each mention to a friend (case-insensitive); first match wins per name
    seen_ids: Set[str] = set()
    group: List[Tuple[str, Dict[str, Any]]] = []

    # Add user first
    user_prefs = _parse_preferences(profile.get("preferences"))
    user_name = (profile.get("display_name") or "You").strip() or "You"
    group.append((user_name, user_prefs))
    seen_ids.add(user_id)

    for mention in mentions:
        mention_clean = mention.strip().lower()
        if not mention_clean:
            continue
        for friend_display_lower, data in friend_by_name.items():
            if friend_display_lower == mention_clean:
                fid = data["id"]
                if fid not in seen_ids:
                    seen_ids.add(fid)
                    group.append((data["display_name"], data["preferences"]))
                break

    return group


def _build_group_summary(group: List[Tuple[str, Dict[str, Any]]]) -> str:
    """Build a short plaintext summary of group preferences for the Gemini prompt."""
    if not group:
        return ""
    parts = []
    for name, prefs in group:
        cuisines = _extract_cuisine_weights(prefs)
        taste = _extract_taste_profile(prefs)
        top_cuisines = sorted(cuisines.items(), key=lambda x: -x[1])[:3]
        top_taste = sorted(taste.items(), key=lambda x: -x[1])[:2]
        if not top_cuisines and not top_taste:
            parts.append(f"{name} (no preferences set)")
        else:
            c_str = ", ".join(c.title() for c, _ in top_cuisines) if top_cuisines else ""
            t_str = ", ".join(t for t, _ in top_taste) if top_taste else ""
            bits = []
            if c_str:
                bits.append(f"loves {c_str}")
            if t_str:
                bits.append(f"high {t_str}")
            parts.append(f"{name} ({'; '.join(bits)})")
    return (
        "Group dining with: "
        + " and ".join(parts)
        + ". Please recommend restaurants that work well for everyone in the group."
    )


# --- Pydantic models for chat ---

class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message text")


class RestaurantChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User's restaurant request")
    history: List[ChatMessage] = Field(default_factory=list, description="Previous messages in the conversation")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    suburb: Optional[str] = None


class RestaurantRecommendation(BaseModel):
    name: str = ""
    address: Optional[str] = None
    cuisine: Optional[str] = None
    rating: Optional[float] = None
    photo_url: Optional[str] = None
    reasoning: Optional[str] = None


class RestaurantChatResponse(BaseModel):
    reply: str = Field(..., description="Assistant's conversational reply")
    restaurants: List[RestaurantRecommendation] = Field(default_factory=list)
    follow_up_prompt: Optional[str] = Field(None, description="Optional suggested follow-up question")


# --- Gemini integration (isolated) ---

def _get_gemini_client():
    """Lazy import and client creation so missing key fails only when endpoint is used."""
    try:
        import google.generativeai as genai
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Server missing google-generativeai. Install with: pip install google-generativeai",
        )
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or not api_key.strip():
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY not configured.",
        )
    genai.configure(api_key=api_key.strip())
    return genai


def _build_system_prompt(
    latitude: Optional[float],
    longitude: Optional[float],
    suburb: Optional[str],
    group_summary: Optional[str] = None,
) -> str:
    has_location = (latitude is not None and longitude is not None) or bool(suburb)
    location_desc = ""
    if suburb:
        location_desc = f" The user is in {suburb}."
    elif latitude is not None and longitude is not None:
        location_desc = f" The user's approximate coordinates are ({latitude:.4f}, {longitude:.4f})."
    group_note = f" {group_summary.strip()}" if group_summary and group_summary.strip() else ""
    no_location_note = (
        "" if has_location else
        " IMPORTANT: No location has been provided. If the user is asking for nearby or local recommendations, "
        "set needs_location to true and politely ask them which suburb or area they'd like to eat in."
    )
    return (
        "You are a friendly restaurant recommendation assistant. "
        "Your job is to understand what the user wants to eat and produce a concise food/vibe search term for Google Places. "
        "Do NOT invent, fabricate, or name specific restaurants — real search results will be fetched automatically from Google Places using your search term.\n\n"
        "Rules for search_query:\n"
        "- Use a food type or vibe (e.g. 'Thai food', 'romantic Italian', 'cheap ramen', 'best sushi', 'brunch cafe').\n"
        "- Do NOT include location words in search_query — location is handled separately.\n"
        "- Set search_query to null if the user is not asking for a restaurant recommendation.\n\n"
        "Rules for needs_location:\n"
        "- Set to true ONLY when no location is available and the user is asking for nearby recommendations.\n"
        "- Set to false when location is known or the user has specified a place themselves.\n"
        + no_location_note
        + location_desc
        + group_note
        + "\n\n"
        "You must respond with exactly two parts separated by ---JSON--- on its own line.\n"
        "Part 1: your conversational reply (plain text, 1-2 sentences, no markdown).\n"
        "Part 2: a single line of valid JSON: {\"search_query\": \"...\", \"needs_location\": false}\n"
        "Example:\n"
        "Great choice for a date night! Let me find some options near you.\n"
        "---JSON---\n"
        "{\"search_query\": \"romantic Italian restaurant\", \"needs_location\": false}"
    )


def _parse_gemini_response(text: str) -> Tuple[str, Optional[str], bool]:
    """Extract reply, search_query, and needs_location from model output."""
    reply = text.strip()
    search_query: Optional[str] = None
    needs_location = False

    if "---JSON---" in reply:
        parts = reply.split("---JSON---", 1)
        reply = parts[0].strip()
        raw_json = parts[1].strip() if len(parts) > 1 else ""
        match = re.search(r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", raw_json, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group())
                sq = data.get("search_query")
                search_query = str(sq).strip() if sq else None
                needs_location = bool(data.get("needs_location", False))
            except json.JSONDecodeError:
                pass

    return reply, search_query, needs_location


def _call_gemini_for_query(
    user_message: str,
    history: List[ChatMessage],
    latitude: Optional[float],
    longitude: Optional[float],
    suburb: Optional[str],
    group_summary: Optional[str] = None,
) -> Tuple[str, Optional[str], bool]:
    """Call Gemini to extract a search query. Returns (reply, search_query, needs_location)."""
    genai = _get_gemini_client()
    model = genai.GenerativeModel("gemini-2.5-flash")

    system_prompt = _build_system_prompt(latitude, longitude, suburb, group_summary)
    parts = [system_prompt, "\n\nConversation:\n"]
    for msg in history[-10:]:  # cap history
        parts.append(f"{msg.role}: {msg.content}\n")
    parts.append(f"user: {user_message}\n")
    parts.append("assistant: ")

    prompt_text = "".join(parts)

    try:
        response = model.generate_content(prompt_text)
        text = (getattr(response, "text", None) or "").strip()
        if not text and getattr(response, "candidates", None):
            cand = response.candidates[0] if response.candidates else None
            if cand and getattr(cand, "content", None) and getattr(cand.content, "parts", None) and cand.content.parts:
                text = getattr(cand.content.parts[0], "text", None) or ""
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini request failed: {str(e)}") from e

    if not text.strip():
        return "I couldn't generate a response right now. Try rephrasing your question.", None, False

    return _parse_gemini_response(text)


async def _search_places(
    search_query: str,
    latitude: Optional[float],
    longitude: Optional[float],
    suburb: Optional[str],
) -> List[RestaurantRecommendation]:
    """Call Google Places Text Search and return up to 5 real restaurant results."""
    if not _PLACES_API_KEY:
        return []

    text = f"{search_query} in {suburb.strip()}" if suburb else search_query

    params: dict = {
        "query": text,
        "type": "restaurant",
        "key": _PLACES_API_KEY,
        "language": "en",
    }
    has_coords = latitude is not None and longitude is not None
    if has_coords:
        params["location"] = f"{latitude},{longitude}"
        params["radius"] = 3000

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(_TEXT_SEARCH_URL, params=params)
    except Exception:
        return []

    if resp.status_code != 200:
        return []

    data = resp.json()
    if data.get("status") not in ("OK", "ZERO_RESULTS"):
        return []

    places = data.get("results", [])
    restaurant_places = [
        p for p in places
        if "restaurant" in p.get("types", [])
        or any(t.endswith("_restaurant") for t in p.get("types", []))
    ]

    results = []
    for p in restaurant_places[:5]:
        photos = p.get("photos", [])
        photo_url = None
        if photos:
            ref = photos[0].get("photo_reference")
            if ref:
                photo_url = (
                    f"https://maps.googleapis.com/maps/api/place/photo"
                    f"?maxwidth=400&photoreference={ref}&key={_PLACES_API_KEY}"
                )
        results.append(RestaurantRecommendation(
            name=p.get("name") or "Unnamed",
            address=p.get("formatted_address"),
            cuisine=_infer_cuisine(p.get("types", [])),
            rating=p.get("rating"),
            photo_url=photo_url,
        ))

    return results


@router.post("/api/restaurants/chat", response_model=RestaurantChatResponse)
async def restaurant_chat(
    body: RestaurantChatRequest,
    authorization: Optional[str] = Header(default=None),
):
    """Authenticated endpoint: Gemini extracts a search term, then real results are fetched from Google Places."""
    token = extract_token(authorization)
    user_id = get_user_id_from_token(token)

    message = body.message.strip()
    group_summary = None
    group = _resolve_mentions_to_group(user_id, message)
    if group:
        group_summary = _build_group_summary(group)

    reply, search_query, needs_location = _call_gemini_for_query(
        user_message=message,
        history=body.history,
        latitude=body.latitude,
        longitude=body.longitude,
        suburb=body.suburb,
        group_summary=group_summary,
    )

    if needs_location or not search_query:
        return RestaurantChatResponse(reply=reply, restaurants=[])

    restaurants = await _search_places(
        search_query=search_query,
        latitude=body.latitude,
        longitude=body.longitude,
        suburb=body.suburb,
    )

    return RestaurantChatResponse(
        reply=reply or "Here are some options for you!",
        restaurants=restaurants,
    )
