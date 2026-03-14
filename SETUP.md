# Food Network – Setup Guide

How to clone, configure, and run the project.

## Prerequisites

- **Node.js** 18+ and npm
- **Expo Go** app on your phone (for testing without a simulator), or:
  - **iOS**: Mac with Xcode (for simulator)
  - **Android**: Android Studio with emulator
- **Git**
- **Supabase** account (supabase.com)

---

## 1. Clone the repo

```bash
git clone <your-repo-url>
cd food_network
```

---

## 2. Supabase setup

1. Create a project at [supabase.com](https://supabase.com) (or use an existing one).
2. Go to **SQL Editor** → **New query**.
3. Copy the contents of `supabase/schema.sql` and run it.
4. This creates: `profiles`, `restaurants`, RLS policies, and seeds 2 sample restaurants.

---

## 3. Mobile app setup

```bash
cd mobile
npm install
```

### Environment variables

Create a `.env` file (never commit this):

```bash
cp .env.example .env
```

Edit `.env` and add:

| Variable | Where to get it |
|----------|-----------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same place as above |
| `EXPO_PUBLIC_API_URL` | Your backend URL (e.g. `http://localhost:8000` or Render URL) |

### Run the app

```bash
npm start
```

Then:

- **Phone**: Install [Expo Go](https://expo.dev/go), scan the QR code
- **iOS simulator** (Mac): Press `i` in the terminal
- **Android emulator**: Press `a` in the terminal

---

## 4. Backend setup (when ready)

```bash
cd backend
pip install fastapi uvicorn python-dotenv python-multipart
cp .env.example .env
```

Edit `.env` and add:

| Variable | Where to get it |
|----------|-----------------|
| `SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_KEY` | Same place (use **service_role** key, not anon) |
| `GEMINI_API_KEY` | Google AI Studio |
| `FRONTEND_URL` | `http://localhost:8081` for dev |

```bash
uvicorn main:app --reload --port 8000
```

---

## Sharing env vars with the team

**Do not commit `.env`.** Options:

1. **Share manually** – Send values in a secure channel (DIscord)
2. **`.env.example`** – Keep a template in the repo (no secrets)
3. **Team password manager** – Store secrets in 1Password, Bitwarden, etc.
4. **Docs** – Add a short note in README: "Ask [name] for env vars"

---

## Quick reference

| Command | Location |
|---------|----------|
| `npm start` | `mobile/` |
| `npm run ios` | `mobile/` |
| `npm run android` | `mobile/` |
| `uvicorn main:app --reload --port 8000` | `backend/` |

## Env vars summary

**Mobile** (`mobile/.env`): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_URL`

**Backend** (`backend/.env`): `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GEMINI_API_KEY`, `FRONTEND_URL`
