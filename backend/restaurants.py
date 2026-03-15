"""
Restaurant recommendations chat: protected FastAPI routes that call Gemini.
API key is read from env (GEMINI_API_KEY) and never exposed to the client.
"""
import json
import os
import re
from typing import Any, Dict, List, Optional, Tuple, Set

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from auth import extract_token, get_user_id_from_token
from db import supabase
from network_graph import (
    _extract_cuisine_weights,
    _extract_taste_profile,
    _parse_preferences,
)

router = APIRouter()


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


class RestaurantRecommendation(BaseModel):
    name: str = ""
    address: Optional[str] = None
    cuisine: Optional[str] = None
    rating: Optional[float] = None
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
    group_summary: Optional[str] = None,
) -> str:
    location_note = ""
    if latitude is not None and longitude is not None:
        location_note = f" The user's approximate location is latitude {latitude}, longitude {longitude}. Prefer recommending places that could be near them when they ask for 'near me' or local suggestions."
    group_note = ""
    if group_summary and group_summary.strip():
        group_note = f" {group_summary.strip()}"
    return (
        "You are a friendly restaurant recommendation assistant. "
        "Answer concisely and helpfully. "
        "When the user asks for restaurant suggestions, provide a short conversational reply and, when relevant, a JSON array of 1-5 recommended restaurants. "
        "Each restaurant must have: name (string), address (string or null), cuisine (string or null), rating (number 0-5 or null), reasoning (short reason for this pick or null). "
        + location_note
        + group_note
        + "\n\n"
        "You must respond with exactly two parts separated by the delimiter ---JSON--- on its own line. "
        "Part 1: your conversational reply (plain text, no markdown). "
        "Part 2: a single line of valid JSON: {\"restaurants\": [{\"name\": \"...\", \"address\": \"...\", \"cuisine\": \"...\", \"rating\": 4.5, \"reasoning\": \"...\"}]}. "
        "If there are no specific restaurants to recommend, use \"restaurants\": []. "
        "Example format:\n"
        "Here are a few places you might like!\n"
        "---JSON---\n"
        "{\"restaurants\": [{\"name\": \"Sushi Bar\", \"address\": \"123 Main St\", \"cuisine\": \"Japanese\", \"rating\": 4.5, \"reasoning\": \"Great for date night\"}]}"
    )


def _parse_gemini_response(text: str) -> Tuple[str, List[Dict[str, Any]]]:
    """Extract reply and restaurants list from model output. Returns (reply, restaurants)."""
    reply = text.strip()
    restaurants: List[Dict[str, Any]] = []

    if "---JSON---" in reply:
        parts = reply.split("---JSON---", 1)
        reply = parts[0].strip()
        raw_json = parts[1].strip() if len(parts) > 1 else ""
        # Try to find a JSON object in the second part
        match = re.search(r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", raw_json, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group())
                restaurants = data.get("restaurants") or []
                if not isinstance(restaurants, list):
                    restaurants = []
            except json.JSONDecodeError:
                pass

    return reply, restaurants


def _call_gemini(
    user_message: str,
    history: List[ChatMessage],
    latitude: Optional[float],
    longitude: Optional[float],
    group_summary: Optional[str] = None,
) -> RestaurantChatResponse:
    """Call Gemini and return a normalized RestaurantChatResponse."""
    genai = _get_gemini_client()
    model = genai.GenerativeModel("gemini-2.5-flash")

    system_prompt = _build_system_prompt(latitude, longitude, group_summary)
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
        return RestaurantChatResponse(
            reply="I couldn't generate a response right now. Try rephrasing your question or ask again later.",
            restaurants=[],
            follow_up_prompt="What kind of cuisine or vibe are you in the mood for?",
        )

    reply, raw_restaurants = _parse_gemini_response(text)
    restaurants = []
    for r in raw_restaurants:
        if not isinstance(r, dict):
            continue
        restaurants.append(
            RestaurantRecommendation(
                name=str(r.get("name") or "").strip() or "Unnamed",
                address=str(r.get("address")).strip() if r.get("address") else None,
                cuisine=str(r.get("cuisine")).strip() if r.get("cuisine") else None,
                rating=float(r["rating"]) if r.get("rating") is not None else None,
                reasoning=str(r.get("reasoning")).strip() if r.get("reasoning") else None,
            )
        )

    return RestaurantChatResponse(
        reply=reply or "Here are some ideas for you.",
        restaurants=restaurants,
        follow_up_prompt="Want more options or a different type of place?",
    )


@router.post("/api/restaurants/chat", response_model=RestaurantChatResponse)
def restaurant_chat(
    body: RestaurantChatRequest,
    authorization: Optional[str] = Header(default=None),
):
    """Authenticated endpoint: send a message and get a Gemini-powered reply with optional restaurant list."""
    token = extract_token(authorization)
    user_id = get_user_id_from_token(token)

    message = body.message.strip()
    group_summary = None
    group = _resolve_mentions_to_group(user_id, message)
    if group:
        group_summary = _build_group_summary(group)

    return _call_gemini(
        user_message=message,
        history=body.history,
        latitude=body.latitude,
        longitude=body.longitude,
        group_summary=group_summary,
    )
