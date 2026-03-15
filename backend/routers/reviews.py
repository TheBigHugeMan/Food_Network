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

        supabase.table("reviews").insert({
            "profile_id": profile_id,
            "restaurant_id": restaurant_id,
            "description": description,
            "rating": rating,
            "image_url": image_url,
        }).execute()

        return {"status": "ok", "image_url": image_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
