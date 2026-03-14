# Food Network

AI-powered restaurant discovery – Expo React Native app for a 24-hour hackathon.

## Quick start

```bash
git clone <your-repo-url>
cd food_network/mobile
npm install
cp .env.example .env   # Edit .env with your keys
npm start
```

**Full setup:** See [SETUP.md](./SETUP.md) for detailed instructions.

## What you need

- Node.js 18+
- Expo Go app (or iOS/Android simulator)
- Supabase project (for auth + DB)
- Backend API URL (FastAPI)

## Project structure

```
food_network/
├── mobile/          # Expo React Native app
├── SETUP.md         # Setup guide for collaborators
└── .cursor/         # Cursor AI rules
```

## Env vars

Create `mobile/.env` from `mobile/.env.example`. Get Supabase keys from your project dashboard. Ask your team lead for the backend URL.
