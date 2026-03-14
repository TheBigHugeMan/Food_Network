# Food Network Mobile

Expo React Native app for AI restaurant discovery.

## Setup

1. **Install dependencies** (already done):
   ```bash
   npm install
   ```

2. **Environment variables** – Copy `.env.example` to `.env` and fill in:
   - `EXPO_PUBLIC_SUPABASE_URL` – Your Supabase project URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` – Supabase anon key
   - `EXPO_PUBLIC_API_URL` – Backend URL (e.g. `http://localhost:8000` or Render URL)

3. **Run the app**:
   ```bash
   npm start
   ```
   Then:
   - Press `i` for iOS simulator (Mac only)
   - Press `a` for Android emulator
   - Or scan QR code with Expo Go app on your phone

## Project structure

```
mobile/
├── app/
│   └── screens/
│       ├── LoginScreen.tsx   # Google sign-in (TODO)
│       ├── SearchScreen.tsx  # AI search UI
│       └── MapScreen.tsx    # Map with markers
├── lib/
│   ├── supabase.ts          # Supabase client
│   └── api.ts               # Backend API client
├── App.tsx                  # Navigation + entry
└── .env                     # Your env vars (create from .env.example)
```

## Next steps

1. Wire backend: Update `SearchScreen` to call `searchRestaurants()` from `lib/api.ts`
2. Add auth: Implement Supabase `signInWithOAuth` in `LoginScreen`
3. Pass results to Map: Use `navigation.navigate('Map', { restaurants })` in `SearchScreen`
