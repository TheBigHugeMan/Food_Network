# Taste Buds

Taste Buds is an AI-powered restaurant discovery app built for a hackathon. It helps users find places to eat, get personalized recommendations, and explore a social taste graph based on shared dining preferences.

## What It Does

- Lets users sign in with Supabase authentication
- Finds restaurants using Google Places
- Generates recommendation chat responses with Gemini
- Shows a social graph of friends and shared food taste
- Supports profile photos and profile data stored in Supabase

## Tech Stack

- `mobile/`: Expo + React Native + TypeScript
- `backend/`: FastAPI + Python
- `supabase/`: database schema and seed SQL
- `Render`: backend hosting
- `Supabase`: auth, database, and storage

## For Judges

This repository does not commit any secret keys.

- The backend is deployed separately and keeps all server-side secrets there.
- The frontend uses Expo environment variables for the Supabase public client and backend URL.
- If you are reviewing the code only, this repo is enough to understand the architecture and implementation.
- If you want to run the mobile app locally, you will need the frontend `.env` values from the team.

## Quick Start

### Mobile app

```bash
git clone <your-repo-url>
cd Food_Network/mobile
npm install
```

Create `mobile/.env` with:

```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_API_URL=your-backend-url
```

Then run:

```bash
npx expo start --tunnel
```

### Backend

The backend lives in `backend/` and is already designed for deployment on Render.

Run locally with:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Required backend environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GOOGLE_PLACES_API_KEY`
- `GEMINI_API_KEY`
- `FRONTEND_URL`

## Project Structure

```text
Food_Network/
├── mobile/        # Expo React Native frontend
├── backend/       # FastAPI backend
├── supabase/      # Schema and seed SQL
├── README.md
└── SETUP.md
```

## Key Features

### AI restaurant search

Users can ask for restaurant suggestions, and the app combines user context, location, and Gemini-generated responses.

### Social taste graph

The app visualizes friendship and taste similarity using profile preferences and seeded social graph data.

### Profile management

Users can upload avatars and manage profile details stored in Supabase.

## Deployment Notes

- Backend deployment is intended for Render.
- Mobile development is intended for Expo Go or simulator testing.
- Supabase handles authentication, storage, and database persistence.

## Additional Documentation

- `SETUP.md`: full local setup guide
- `backend/README.md`: backend-specific setup and API notes
- `mobile/README.md`: frontend-specific notes
