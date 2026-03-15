import json
from typing import Any, Dict, List, Optional, Set, Tuple

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from auth import extract_token, get_user_id_from_token
from db import supabase

router = APIRouter()


class GraphNode(BaseModel):
    id: str
    displayName: Optional[str] = None
    avatarUrl: Optional[str] = None
    isSelf: bool = False


class GraphEdge(BaseModel):
    fromId: str
    toId: str
    score: float
    reason: str


class NetworkGraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]


def _parse_preferences(value: Any) -> Dict[str, Any]:
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return {}
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def _extract_cuisine_weights(preferences: Dict[str, Any]) -> Dict[str, float]:
    raw = preferences.get("cuisineFrequency")
    if not isinstance(raw, list):
        return {}

    weights: Dict[str, float] = {}
    for item in raw:
        if not isinstance(item, dict):
            continue
        cuisine = str(item.get("cuisine", "")).strip().lower()
        if not cuisine:
            continue
        count = item.get("count", 0)
        try:
            value = float(count)
        except (TypeError, ValueError):
            value = 0.0
        if value > 0:
            weights[cuisine] = value
    return weights


def _extract_taste_profile(preferences: Dict[str, Any]) -> Dict[str, float]:
    raw = preferences.get("tasteProfile")
    if not isinstance(raw, dict):
        return {}
    profile: Dict[str, float] = {}
    for key, val in raw.items():
        try:
            score = float(val)
        except (TypeError, ValueError):
            continue
        profile[str(key).strip().lower()] = max(0.0, min(100.0, score))
    return profile


def _weighted_jaccard(left: Dict[str, float], right: Dict[str, float]) -> float:
    if not left and not right:
        return 0.0
    keys = set(left.keys()).union(right.keys())
    num = 0.0
    den = 0.0
    for key in keys:
        lv = left.get(key, 0.0)
        rv = right.get(key, 0.0)
        num += min(lv, rv)
        den += max(lv, rv)
    return (num / den) if den else 0.0


def _taste_similarity(left: Dict[str, float], right: Dict[str, float]) -> float:
    common = set(left.keys()).intersection(right.keys())
    if not common:
        return 0.0
    avg_diff = sum(abs(left[k] - right[k]) / 100.0 for k in common) / len(common)
    return max(0.0, 1.0 - avg_diff)


def _restaurant_overlap_similarity(left: Set[str], right: Set[str]) -> Tuple[float, int]:
    if not left or not right:
        return 0.0, 0
    shared_count = len(left.intersection(right))
    union_count = len(left.union(right))
    if union_count == 0:
        return 0.0, 0
    return shared_count / union_count, shared_count


def _compute_similarity(
    left_preferences: Dict[str, Any],
    right_preferences: Dict[str, Any],
    left_restaurants: Set[str],
    right_restaurants: Set[str],
) -> Tuple[float, str]:
    left_cuisines = _extract_cuisine_weights(left_preferences)
    right_cuisines = _extract_cuisine_weights(right_preferences)
    cuisine_score = _weighted_jaccard(left_cuisines, right_cuisines)

    left_taste = _extract_taste_profile(left_preferences)
    right_taste = _extract_taste_profile(right_preferences)
    taste_score = _taste_similarity(left_taste, right_taste)

    restaurant_score, shared_restaurants = _restaurant_overlap_similarity(left_restaurants, right_restaurants)

    if shared_restaurants > 0:
        score = (0.5 * cuisine_score) + (0.2 * taste_score) + (0.3 * restaurant_score)
        reason = f"{shared_restaurants} shared restaurant{'s' if shared_restaurants > 1 else ''}"
    else:
        score = (0.7 * cuisine_score) + (0.3 * taste_score)
        shared_cuisines = sorted(set(left_cuisines.keys()).intersection(right_cuisines.keys()))
        if shared_cuisines:
            preview = ", ".join(c.title() for c in shared_cuisines[:2])
            reason = f"Shared cuisines: {preview}"
        elif left_taste and right_taste:
            reason = "Similar taste profile"
        else:
            reason = "No preference overlap yet"

    score = max(0.0, min(1.0, score))
    return round(score, 3), reason


def _fetch_restaurant_visits(user_ids: List[str]) -> Dict[str, Set[str]]:
    if not user_ids:
        return {}

    user_to_restaurants: Dict[str, Set[str]] = {uid: set() for uid in user_ids}
    try:
        response = (
            supabase
            .table("user_restaurant_visits")
            .select("user_id,restaurant_id")
            .in_("user_id", user_ids)
            .execute()
        )
        for row in response.data or []:
            uid = row.get("user_id")
            rid = row.get("restaurant_id")
            if uid in user_to_restaurants and rid:
                user_to_restaurants[uid].add(str(rid))
    except Exception:
        return user_to_restaurants
    return user_to_restaurants


@router.get("/api/network/graph", response_model=NetworkGraphResponse)
def get_network_graph(authorization: Optional[str] = Header(default=None)):
    token = extract_token(authorization)
    user_id = get_user_id_from_token(token)

    profile_result = (
        supabase
        .table("profiles")
        .select("id,display_name,avatar_url,friends,preferences")
        .eq("id", user_id)
        .execute()
    )
    profile_rows = profile_result.data or []
    profile = profile_rows[0] if profile_rows else None
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")

    nodes: List[GraphNode] = [
        GraphNode(
            id=str(profile["id"]),
            displayName=profile.get("display_name"),
            avatarUrl=profile.get("avatar_url"),
            isSelf=True,
        )
    ]
    edges: List[GraphEdge] = []

    raw_friends = profile.get("friends") or []
    friend_ids = [str(fid) for fid in raw_friends if str(fid) != user_id]
    friend_ids = list(dict.fromkeys(friend_ids))
    if not friend_ids:
        return NetworkGraphResponse(nodes=nodes, edges=edges)

    friends_result = (
        supabase
        .table("profiles")
        .select("id,display_name,avatar_url,preferences")
        .in_("id", friend_ids)
        .execute()
    )
    friend_profiles = friends_result.data or []

    preferences_self = _parse_preferences(profile.get("preferences"))
    visit_map = _fetch_restaurant_visits([user_id, *friend_ids])
    my_visits = visit_map.get(user_id, set())

    for friend in friend_profiles:
        friend_id = str(friend.get("id"))
        nodes.append(
            GraphNode(
                id=friend_id,
                displayName=friend.get("display_name"),
                avatarUrl=friend.get("avatar_url"),
                isSelf=False,
            )
        )
        friend_preferences = _parse_preferences(friend.get("preferences"))
        friend_visits = visit_map.get(friend_id, set())
        score, reason = _compute_similarity(
            preferences_self,
            friend_preferences,
            my_visits,
            friend_visits,
        )
        edges.append(
            GraphEdge(
                fromId=user_id,
                toId=friend_id,
                score=score,
                reason=reason,
            )
        )

    edges.sort(key=lambda edge: edge.score, reverse=True)
    return NetworkGraphResponse(nodes=nodes, edges=edges)
