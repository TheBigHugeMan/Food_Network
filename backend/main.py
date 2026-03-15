import os
import time
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from pydantic import BaseModel # likely we'lluse this later
from supabase import create_client, Client
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

app = FastAPI()

# Add CORS middleware to allow the mobile app to call the backend.
# The frontend origin is loaded from the .env file.
origins = [
    os.getenv("FRONTEND_URL", "http://localhost:8081"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError("SUPABASE_URL or SUPABASE_SERVICE_KEY is missing in environment variables.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.post("/api/profile/image")
async def upload_profile_image(file: UploadFile = File(...), user_id: str = Form(...)):
    try:
        file_bytes = await file.read()
        file_ext = file.filename.split('.')[-1]
        file_path = f"{user_id}/avatar.{file_ext}"
        
        # Upload to Supabase Storage (requires an 'avatars' bucket to be created in the dashboard)
        res = supabase.storage.from_("avatars").upload(
            file=file_bytes,
            path=file_path,
            file_options={"content-type": file.content_type, "upsert": "true"}
        )
        
        # Get public URL
        base_url = supabase.storage.from_("avatars").get_public_url(file_path)
        # Add a cache-busting timestamp to force React Native to load the new image
        avatar_url = f"{base_url}?t={int(time.time())}"
        
        # Update database
        supabase.table("profiles").update({"avatar_url": avatar_url}).eq("id", user_id).execute()
        
        return {"avatar_url": avatar_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/profile/{user_id}")
async def get_profile(user_id: str):
    """
    Return profile data for a given user_id.
    Extended fields (bio, taste_profile, cuisine_frequency, restaurant_visits,
    top_restaurants) are stored as JSON in the `preferences` column.
    """
    try:
        result = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
        row = result.data
        if not row:
            raise HTTPException(status_code=404, detail="Profile not found")

        # Parse JSON stored in the `preferences` text column
        import json as _json
        prefs: dict = {}
        if row.get("preferences"):
            try:
                prefs = _json.loads(row["preferences"])
            except (ValueError, TypeError):
                prefs = {}

        friends_list = row.get("friends") or []

        profile = {
            "id": row.get("id"),
            "display_name": row.get("display_name") or "",
            "username": row.get("username") or "",
            "avatar_url": row.get("avatar_url"),
            "friends_count": len(friends_list),
            # Always-visible fields default to 0 / empty string
            "bio": prefs.get("bio", ""),
            "restaurant_visits": prefs.get("restaurant_visits", 0),
            # Optional fields — omit key entirely when absent so the frontend
            # can distinguish "not set" from an empty value
        }

        if prefs.get("taste_profile"):
            profile["taste_profile"] = prefs["taste_profile"]

        if prefs.get("cuisine_frequency"):
            profile["cuisine_frequency"] = prefs["cuisine_frequency"]

        if prefs.get("top_restaurants"):
            profile["top_restaurants"] = prefs["top_restaurants"]

        return profile
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Allows running the server with `python main.py`
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
