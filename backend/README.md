# Food Network Backend

FastAPI backend for the Food Network mobile app: Supabase auth, social graph, profile image upload, and Gemini-powered restaurant chat.

## Requirements

- Python 3.9+
- A Supabase project
- A [Gemini API key](https://aistudio.google.com/app/apikey) (for restaurant recommendations chat)

## Setup

### 1. Virtual environment (recommended)

```bash
cd backend
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

This includes FastAPI, Uvicorn, Supabase, and the Gemini SDK. **Form/file upload** (e.g. profile image) also needs:

```bash
pip install python-multipart
```

(`python-multipart` is listed in `requirements.txt` so `pip install -r requirements.txt` installs it.)

### 3. Environment variables

Create a `.env` file in the `backend` directory (do not commit it). Example:

```env
# Supabase (required for auth and data)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Optional: allow the mobile app to call the API (CORS)
FRONTEND_URL=http://localhost:8081

# Required for restaurant recommendations chat (Gemini)
GEMINI_API_KEY=your-gemini-api-key
```

- **SUPABASE_URL** / **SUPABASE_SERVICE_KEY**: From your [Supabase](https://supabase.com) project (Settings → API). The backend uses the service role key to verify JWTs and read profiles/friends.
- **FRONTEND_URL**: Origin of the Expo/mobile app (e.g. `http://localhost:8081` for Expo, or your tunnel URL). Used for CORS.
- **GEMINI_API_KEY**: From [Google AI Studio](https://aistudio.google.com/app/apikey). Required for `/api/restaurants/chat`. If missing, that endpoint returns 503.

### 4. Run the server

```bash
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- **`--host 0.0.0.0`**: Binds to all interfaces so the mobile app on the same LAN (or a phone) can reach the backend. Without this, only `localhost` can connect.
- **`--reload`**: Restarts the server when code changes (optional for development).

Test in a browser or with curl:

```bash
curl http://localhost:8000/
# Expect: {"Hello":"World"}
```

## Common setup issues

| Issue | What to do |
|-------|------------|
| **Form data requires "python-multipart"** | Run `pip install python-multipart` and restart uvicorn. |
| **GEMINI_API_KEY not configured** (503 on chat) | Add `GEMINI_API_KEY` to `.env` and restart the server. |
| **404 / gemini-1.5-flash is not found** | The Gemini model name in code may be deprecated. Use a supported model (e.g. `gemini-2.5-flash` or `gemini-2.0-flash`) in `restaurants.py` where `GenerativeModel(...)` is called. |
| **Phone / app can't reach backend** | Ensure uvicorn is run with `--host 0.0.0.0`. Use your machine’s LAN IP (e.g. from `ifconfig` or `ipconfig`) in the mobile app’s `API_URL`. Allow inbound TCP port 8000 in your OS firewall if needed. |

## API overview

- `GET /` — Health check.
- `GET /api/network/graph` — Social taste graph (requires `Authorization: Bearer <token>`).
- `POST /api/restaurants/chat` — Restaurant recommendations via Gemini (requires Bearer token; body: `message`, optional `history`, `latitude`, `longitude`).
- `POST /api/profile/image` — Upload profile avatar (multipart form: `file`, `user_id`).
