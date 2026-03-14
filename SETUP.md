# Food Network – Setup Guide

How to clone, configure, and run the project.

## Prerequisites

- **Node.js** 18+ and npm
- **Expo Go** app on your phone (for testing without a simulator), or:
  - **iOS**: Mac with Xcode (for simulator)
  - **Android**: Android Studio with emulator
- **Git**

---

## 1. Clone the repo

```bash
git clone
cd food_network
```

---

## 2. Mobile app setup

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

## 3. Backend setup (when ready)

The backend is in `../dashboard/backend/` or will be added to this repo.

```bash
cd backend  # or path to FastAPI project
pip install -r requirements.txt
```

Set env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GEMINI_API_KEY`, `FRONTEND_URL`

```bash
python main.py
```

---

## Sharing env vars with the team

**Do not commit `.env`.** Options:

1. **Share manually** – Send values in a secure channel (Slack, 1Password, etc.)
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
