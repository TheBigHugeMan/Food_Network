import os
import time

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

from db import supabase
from network_graph import router as network_graph_router
from restaurants import router as restaurants_router

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

app.include_router(network_graph_router)
app.include_router(restaurants_router)

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

# Allows running the server with `python main.py`
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
