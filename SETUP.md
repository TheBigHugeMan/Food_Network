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

### Google Auth (Sign in with Google)

1. In Supabase: **Authentication** → **Providers** → **Google** → Enable it.
2. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Create **OAuth 2.0 Client ID** (Web application)
   - **Authorized redirect URIs**: add `https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback`
   - Copy the **Client ID** and **Client Secret** into Supabase Google provider settings
3. Add your app's redirect URL to Supabase: **Authentication** → **URL Configuration** → **Redirect URLs**:
   - **Expo Go**: Run `npx expo start`, then add `exp://<YOUR_IP>:8081` (e.g. `exp://192.168.1.5:8081`)
   - **Tunnel mode**: Run `npx expo start --tunnel`, copy the `https://xxx.exp.direct` URL and add it
   - **Custom scheme** (dev builds): Add `foodnetwork://auth/callback`

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
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## 5. Social graph seed + verification

Use this to populate `profiles.preferences`, `profiles.friends`, and `user_restaurant_visits` so the Network tab shows a real graph.

### Seed data

1. In Supabase: **SQL Editor** → **New query**.
2. Run `supabase/schema.sql` first (if not already run).
3. Run `supabase/social_graph_seed.sql`.

Notes:
- The seed script only links **existing profiles**. You need at least 2 users for a real edge graph.
- If you only have one profile, you will still see the demo graph fallback in-app (as designed).

### Create extra test users (if needed)

Fast way:
- Open the app on your phone/emulator.
- Sign in with one account.
- Sign out.
- Sign in with a second Google account.
- Repeat for a third account.
- Re-run `supabase/social_graph_seed.sql`.

### Run backend + mobile

Backend:
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Mobile:
```bash
cd mobile
npm install
npm start
```

### Verify it works

1. Log in to the app with any seeded user.
2. Open the **Network** tab.
3. Expected:
   - You are in the center.
   - Friends appear around you.
   - Closer friends should generally have higher similarity.
4. Tap an edge:
   - You should see a modal with a percentage score and reason (e.g., shared cuisines or shared restaurants).
5. If you still see the demo graph:
   - Ensure there are at least 2 users in `public.profiles`.
   - Re-run `supabase/social_graph_seed.sql`.
   - Confirm backend is running and mobile `API_URL` points to it.

### Quick DB checks in Supabase SQL Editor

```sql
select id, display_name, friends, preferences
from public.profiles
order by created_at;
```

```sql
select user_id, count(*) as visits
from public.user_restaurant_visits
group by user_id
order by visits desc;
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
