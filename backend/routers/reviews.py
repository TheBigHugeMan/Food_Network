"""
Review-related endpoints: list restaurants (for picker), create review (upload image + insert row).
Mount under /api so routes are GET /api/restaurants, POST /api/reviews.
"""
import time
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from db import supabase

router = APIRouter(prefix="/api", tags=["reviews"])


@router.get("/restaurants")
def list_restaurants():
    """Return id and name for all restaurants (for review form picker)."""
    try:
        res = supabase.table("restaurants").select("id, name").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reviews/{profile_id}")
def get_profile_reviews(profile_id: str):
    """Return all reviews for a given profile, joined with restaurant name, newest first."""
    try:
        res = (
            supabase.table("reviews")
            .select("id, description, rating, image_url, created_at, restaurant_id, restaurants(name)")
            .eq("profile_id", profile_id)
            .order("created_at", desc=True)
            .execute()
        )
        reviews = []
        for row in res.data:
            restaurant_info = row.pop("restaurants", None)
            restaurant_name = "Unknown"
            if isinstance(restaurant_info, dict):
                restaurant_name = restaurant_info.get("name", "Unknown")
            elif isinstance(restaurant_info, list) and len(restaurant_info) > 0:
                first = restaurant_info[0] if isinstance(restaurant_info[0], dict) else None
                restaurant_name = first.get("name", "Unknown") if first else "Unknown"
            row["restaurant_name"] = restaurant_name
            reviews.append(row)
        return reviews
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reviews")
async def create_review(
    profile_id: str = Form(...),
    restaurant_id: str = Form(...),
    description: str = Form(""),
    rating: int = Form(...),
    file: UploadFile = File(...),
):
    """Create a review: upload image to review-images bucket, then insert row in reviews."""
    try:
        file_bytes = await file.read()
        file_ext = (file.filename or "jpg").split(".")[-1]
        if file_ext not in ("jpg", "jpeg", "png", "gif", "webp"):
            file_ext = "jpg"
        file_path = f"{profile_id}/{int(time.time())}_review.{file_ext}"

        supabase.storage.from_("review-images").upload(
            file=file_bytes,
            path=file_path,
            file_options={"content-type": file.content_type or "image/jpeg", "upsert": "true"},
        )
        image_url = supabase.storage.from_("review-images").get_public_url(file_path)

        inserted = supabase.table("reviews").insert({
            "profile_id": profile_id,
            "restaurant_id": restaurant_id,
            "description": description,
            "rating": rating,
            "image_url": image_url,
        }).execute()

        review = inserted.data[0] if inserted.data else {}
        return {"status": "ok", "review": review}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
