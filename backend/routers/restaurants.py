"""
Restaurant search endpoint: query Google Places Text Search API,
persist restaurant-classified results to Supabase (upsert by place_id),
and return the top 5 most relevant matches.
"""
import os
from typing import Optional

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from db import supabase

load_dotenv()  # ensure .env is loaded regardless of import order

router = APIRouter(prefix="/api", tags=["restaurants"])

GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")
_TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
_PHOTO_URL = "https://maps.googleapis.com/maps/api/place/photo"

_bearer = HTTPBearer(auto_error=False)

# ── Cuisine inference ──────────────────────────────────────────────────────────
_CUISINE_MAP: dict[str, str] = {
    "chinese_restaurant": "Chinese",
    "japanese_restaurant": "Japanese",
    "korean_restaurant": "Korean",
    "thai_restaurant": "Thai",
    "vietnamese_restaurant": "Vietnamese",
    "indian_restaurant": "Indian",
    "italian_restaurant": "Italian",
    "french_restaurant": "French",
    "mexican_restaurant": "Mexican",
    "american_restaurant": "American",
    "seafood_restaurant": "Seafood",
    "pizza_restaurant": "Pizza",
    "steak_house": "Steakhouse",
    "burger_restaurant": "Burgers",
    "bakery": "Bakery",
    "cafe": "Cafe",
    "fast_food_restaurant": "Fast Food",
    "sandwich_shop": "Sandwiches",
    "greek_restaurant": "Greek",
    "spanish_restaurant": "Spanish",
    "middle_eastern_restaurant": "Middle Eastern",
    "mediterranean_restaurant": "Mediterranean",
    "breakfast_restaurant": "Breakfast",
    "brunch_restaurant": "Brunch",
    "dessert_restaurant": "Dessert",
    "sushi_restaurant": "Japanese",
    "ramen_restaurant": "Japanese",
}


def _infer_cuisine(types: list[str]) -> Optional[str]:
    for t in types:
        if t in _CUISINE_MAP:
            return _CUISINE_MAP[t]
    # Generic fallback – any "*_restaurant" type that isn't just "restaurant"
    for t in types:
        if t.endswith("_restaurant") and t != "restaurant":
            return t.replace("_restaurant", "").replace("_", " ").title()
    return None


def _make_photo_url(photo_reference: str) -> str:
    return (
        f"{_PHOTO_URL}"
        f"?maxwidth=400"
        f"&photoreference={photo_reference}"
        f"&key={GOOGLE_PLACES_API_KEY}"
    )


def _upsert_restaurants(places: list[dict]) -> None:
    """
    Upsert each Google Places result into the restaurants table.
    Silently drops errors so persistence never blocks the API response.
    """
    for p in places:
        place_id = p.get("place_id")
        if not place_id:
            continue

        lat = p.get("geometry", {}).get("location", {}).get("lat")
        lng = p.get("geometry", {}).get("location", {}).get("lng")
        photos = p.get("photos", [])
        photo_url = _make_photo_url(photos[0]["photo_reference"]) if photos else None
        cuisine = _infer_cuisine(p.get("types", []))

        row: dict = {
            "place_id": place_id,
            "name": p.get("name") or "",
            "formatted_address": p.get("formatted_address") or None,
            "latitude": lat,
            "longitude": lng,
            "cuisine": cuisine,
            "rating_avg": p.get("rating"),
            "user_ratings_total": p.get("user_ratings_total"),
            "price_level": p.get("price_level"),
            "photo_url": photo_url,
        }
        # Strip None values – don't overwrite good existing data with nulls
        row = {k: v for k, v in row.items() if v is not None}
        # Ensure mandatory fields are always present
        row.setdefault("place_id", place_id)
        row.setdefault("name", "")

        try:
            supabase.table("restaurants").upsert(row, on_conflict="place_id").execute()
        except Exception:
            pass


def _build_result(p: dict, rank: int, total: int) -> dict:
    lat = p.get("geometry", {}).get("location", {}).get("lat")
    lng = p.get("geometry", {}).get("location", {}).get("lng")
    photos = p.get("photos", [])
    photo_url = _make_photo_url(photos[0]["photo_reference"]) if photos else None
    match_score = round(1.0 - (rank / max(total, 1)), 2) if total > 1 else 1.0

    return {
        "place_id": p["place_id"],
        "name": p["name"],
        "address": p.get("formatted_address"),
        "latitude": lat,
        "longitude": lng,
        "rating": p.get("rating"),
        "cuisine": _infer_cuisine(p.get("types", [])),
        "photo_url": photo_url,
        "match_score": match_score,
    }


# ── Request / response models ──────────────────────────────────────────────────
class RestaurantSearchRequest(BaseModel):
    query: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    suburb: Optional[str] = None  # Fallback when device coords are unavailable


# ── Endpoint ───────────────────────────────────────────────────────────────────
@router.post("/restaurants/search")
async def search_restaurants(
    body: RestaurantSearchRequest,
    _creds: HTTPAuthorizationCredentials = Depends(_bearer),
):
    """
    Search Google Places for restaurants matching `query` near the user.
    Accepts either lat/lng (device location) or a city/suburb fallback string.
    Results classified as restaurants are upserted into the restaurants table
    and the top 5 most relevant are returned.
    """
    if not GOOGLE_PLACES_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Google Places API key not configured on the server.",
        )

    query = body.query.strip()
    if not query:
        raise HTTPException(status_code=422, detail="Query cannot be empty.")

    has_coords = body.latitude is not None and body.longitude is not None

    # Always embed the suburb in the query text when available – this gives
    # Google Places a strong locality signal regardless of whether coords are
    # also present (coords alone are only a soft bias).
    if body.suburb:
        search_text = f"{query} restaurant in {body.suburb.strip()}"
    else:
        search_text = f"{query} restaurant"

    params: dict = {
        "query": search_text,
        "type": "restaurant",
        "key": GOOGLE_PLACES_API_KEY,
        "language": "en",
    }

    if has_coords:
        # location + radius provides a soft location bias (not strict bounding)
        params["location"] = f"{body.latitude},{body.longitude}"
        params["radius"] = 3000  # 3 km bias

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(_TEXT_SEARCH_URL, params=params)

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Google Places request failed.")

    data = resp.json()
    status = data.get("status")

    if status == "ZERO_RESULTS":
        return {
            "status": "ok",
            "query": query,
            "top_restaurants": [],
            "all_nearby_restaurants": [],
            "location": {"latitude": body.latitude, "longitude": body.longitude}
            if has_coords
            else None,
        }

    if status != "OK":
        raise HTTPException(
            status_code=502,
            detail=f"Google Places error: {data.get('error_message', status)}",
        )

    places = data.get("results", [])

    # Keep only results Google itself classifies as a restaurant
    restaurant_places = [
        p
        for p in places
        if "restaurant" in p.get("types", [])
        or any(t.endswith("_restaurant") for t in p.get("types", []))
    ]

    top5 = restaurant_places[:5]
    all_results = restaurant_places[:20]

    # Persist to Supabase before returning (errors are silently dropped)
    _upsert_restaurants(all_results)

    return {
        "status": "ok",
        "query": query,
        "top_restaurants": [_build_result(p, i, len(top5)) for i, p in enumerate(top5)],
        "all_nearby_restaurants": [
            _build_result(p, i, len(all_results)) for i, p in enumerate(all_results)
        ],
        "location": {"latitude": body.latitude, "longitude": body.longitude}
        if has_coords
        else None,
    }
