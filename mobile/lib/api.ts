/**
 * API client for Food Network backend
 * Set EXPO_PUBLIC_API_URL in .env (e.g. http://localhost:8000 or your Render URL)
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Temporarily keep a manual fallback in case Expo env resolution is unavailable.
const HARDCODED_API_URL = 'http://118.139.22.161:8000';

function debugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
  runId = 'initial'
) {
  fetch('http://127.0.0.1:7291/ingest/43621fe5-6367-42d6-8618-9015640fddbf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '2d6d23',
    },
    body: JSON.stringify({
      sessionId: '2d6d23',
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}

function resolveApiUrl() {
  const envUrlRaw = process.env.EXPO_PUBLIC_API_URL?.trim();
  const envUrl = envUrlRaw?.replace(/\/+$/, '');
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];

  if (envUrl) {
    // Rewrite loopback URLs so physical devices can reach the backend on the dev machine.
    if (envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
      if (host) return envUrl.replace('localhost', host).replace('127.0.0.1', host);
      if (HARDCODED_API_URL) return HARDCODED_API_URL;
      if (Platform.OS === 'android') return 'http://10.0.2.2:8000';
    }
    return envUrl;
  }

  if (HARDCODED_API_URL) return HARDCODED_API_URL;

  // Fallback: derive from Expo dev host if available.
  if (host) return `http://${host}:8000`;

  // Last fallback for local emulator/simulator development.
  return Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
}

const API_URL = resolveApiUrl();

console.log('Current API_URL is:', API_URL);
console.log('API resolution inputs:', {
  envUrl: process.env.EXPO_PUBLIC_API_URL ?? null,
  hostUri: Constants.expoConfig?.hostUri ?? null,
  platform: Platform.OS,
});
// #region agent log
debugLog('H4', 'mobile/lib/api.ts:48', 'api module initialized', {
  apiUrl: API_URL,
  platform: Platform.OS,
  hasExpoHost: Boolean(Constants.expoConfig?.hostUri),
});
// #endregion

export interface Restaurant {
  place_id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  cuisine?: string;
  photo_url?: string;
  match_score?: number;
  reasoning?: string;
}

export interface SearchResponse {
  status: string;
  query: string;
  top_restaurants: Restaurant[];
  all_nearby_restaurants?: Restaurant[];
  location?: { latitude: number; longitude: number };
}

export interface GraphNode {
  id: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  isSelf?: boolean;
}

export interface GraphEdge {
  fromId: string;
  toId: string;
  score: number;
  reason: string;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Restaurant chat (Gemini recommendations)
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface RestaurantChatRequest {
  message: string;
  history?: ChatMessage[];
  latitude?: number;
  longitude?: number;
  suburb?: string;
}

export interface RestaurantRecommendation {
  name: string;
  address?: string | null;
  cuisine?: string | null;
  rating?: number | null;
  photo_url?: string | null;
  reasoning?: string | null;
}

export interface RestaurantChatResponse {
  reply: string;
  restaurants: RestaurantRecommendation[];
  follow_up_prompt?: string | null;
}

export async function sendRestaurantChatMessage(
  accessToken: string,
  body: RestaurantChatRequest
): Promise<RestaurantChatResponse> {
  const response = await fetch(`${API_URL}/api/restaurants/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      message: body.message,
      history: body.history ?? [],
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      suburb: body.suburb ?? null,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const detail = typeof errorData?.detail === 'string' ? errorData.detail : response.statusText;
    throw new Error(`Chat failed: ${response.status} - ${detail}`);
  }

  return response.json();
}

export async function searchRestaurants(
  query: string,
  accessToken: string,
  latitude?: number,
  longitude?: number,
  suburb?: string,
): Promise<SearchResponse> {
  const body: Record<string, unknown> = { query };
  if (latitude !== undefined && longitude !== undefined) {
    body.latitude = latitude;
    body.longitude = longitude;
  }
  if (suburb) body.suburb = suburb;

  const response = await fetch(`${API_URL}/api/restaurants/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(`Search failed: ${response.status} – ${errorData?.detail ?? response.statusText}`);
  }

  return response.json();
}

export async function uploadProfileImage(uri: string, userId: string): Promise<{ avatar_url: string }> {
  const filename = uri.split('/').pop();
  const match = /\.(\w+)$/.exec(filename || '');
  const type = match ? `image/${match[1]}` : `image`;

  const formData = new FormData();
  // @ts-ignore - React Native FormData expects an object with uri, name, and type properties
  formData.append('file', { uri, name: filename, type });
  formData.append('user_id', userId);

  console.log(`Attempting upload to: ${API_URL}/api/profile/image`);

  let response;
  try {
    response = await fetch(`${API_URL}/api/profile/image`, {
      method: 'POST',
      body: formData,
    });
  } catch (error) {
    console.error(`Fetch failed completely. Is the server reachable at ${API_URL}?`);
    throw error;
  }

  if (!response.ok) {
    // Extract the exact error message sent from FastAPI
    const errorData = await response.json().catch(() => null);
    const errorMessage = errorData?.detail || response.statusText;
    console.error(`Backend error details:`, errorMessage);
    throw new Error(`Upload failed: ${response.status} - ${errorMessage}`);
  }

  return response.json();
}

export async function getNetworkGraph(accessToken: string): Promise<GraphResponse> {
  // #region agent log
  debugLog('H1', 'mobile/lib/api.ts:223', 'getNetworkGraph request start', {
    apiUrl: API_URL,
    hasAccessToken: Boolean(accessToken),
  });
  // #endregion
  const response = await fetch(`${API_URL}/api/network/graph`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // #region agent log
  debugLog('H1', 'mobile/lib/api.ts:234', 'getNetworkGraph response received', {
    ok: response.ok,
    status: response.status,
  });
  // #endregion

  if (!response.ok) {
    throw new Error(`Network graph failed: ${response.status}`);
  }

  return response.json();
}

// ── Profile types ──────────────────────────────────────────────

export interface TasteProfile {
  bitter: number;
  umami: number;
  sour: number;
  sweet: number;
  salty: number;
}

export interface CuisineFrequency {
  cuisine: string;
  count: number;
}

export interface TopRestaurant {
  id: number | string;
  name: string;
  cuisine: string;
  rating: number;
  color: string;
}

export interface UserProfile {
  id: string;
  display_name: string;
  username: string;
  avatar_url?: string | null;
  friends_count: number;
  bio: string;
  restaurant_visits: number;
  taste_profile?: TasteProfile;
  cuisine_frequency?: CuisineFrequency[];
  top_restaurants?: TopRestaurant[];
}

export async function getProfile(userId: string, accessToken: string): Promise<UserProfile> {
  // #region agent log
  debugLog('H2', 'mobile/lib/api.ts:267', 'getProfile request start', {
    userId,
    hasAccessToken: Boolean(accessToken),
  });
  // #endregion
  const profileUrl = `${API_URL}/api/profile/${encodeURIComponent(userId)}`;
  console.log('getProfile request URL:', profileUrl);
  const response = await fetch(profileUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // #region agent log
  debugLog('H2', 'mobile/lib/api.ts:278', 'getProfile response received', {
    ok: response.ok,
    status: response.status,
  });
  // #endregion

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(`Failed to load profile: ${response.status} - ${errorData?.detail ?? response.statusText}`);
  }

  return response.json();
}

export async function updateBio(userId: string, bio: string, accessToken: string): Promise<{ bio: string }> {
  const response = await fetch(`${API_URL}/api/profile/${encodeURIComponent(userId)}/bio`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ bio }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(`Failed to update bio: ${response.status} - ${errorData?.detail ?? response.statusText}`);
  }

  return response.json();
}

/** Restaurant list item for pickers (id is uuid from Supabase restaurants table). */
export interface RestaurantOption {
  id: string;
  name: string;
}

export async function getRestaurants(): Promise<RestaurantOption[]> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/restaurants`);
  } catch {
    throw new Error(`Failed to reach backend at ${API_URL}`);
  }
  if (!response.ok) throw new Error(`Failed to load restaurants: ${response.status}`);
  return response.json();
}

export async function createReview(
  profileId: string,
  restaurantId: string,
  description: string,
  rating: number,
  imageUri: string,
  _accessToken?: string
): Promise<{ status: string; review: Record<string, unknown> }> {
  const filename = imageUri.split('/').pop();
  const match = /\.(\w+)$/.exec(filename || '');
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  const formData = new FormData();
  // @ts-ignore - React Native FormData
  formData.append('file', { uri: imageUri, name: filename || 'review.jpg', type });
  formData.append('profile_id', profileId);
  formData.append('restaurant_id', restaurantId);
  formData.append('description', description);
  formData.append('rating', String(rating));

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/reviews`, {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new Error(`Network request failed. Backend unreachable at ${API_URL}`);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const msg = errorData?.detail || response.statusText;
    throw new Error(`Review failed: ${response.status} - ${msg}`);
  }
  return response.json();
}

// ── Reviews ──────────────────────────────────────────────

export interface Review {
  id: string;
  description: string;
  rating: number;
  image_url: string;
  created_at: string;
  restaurant_id: string;
  restaurant_name: string;
}

export async function getProfileReviews(userId: string): Promise<Review[]> {
  const reviewsUrl = `${API_URL}/api/reviews/${encodeURIComponent(userId)}`;
  console.log('getProfileReviews request URL:', reviewsUrl);
  const response = await fetch(reviewsUrl);
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(`Failed to load reviews: ${response.status} - ${errorData?.detail ?? response.statusText}`);
  }
  const data = await response.json();
  console.log('getProfileReviews response:', JSON.stringify(data));
  return data;
}
