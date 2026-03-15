/**
 * API client for Food Network backend
 * Set EXPO_PUBLIC_API_URL in .env (e.g. http://localhost:8000 or your Render URL)
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

function resolveApiUrl() {
  const envUrlRaw = process.env.EXPO_PUBLIC_API_URL?.trim();
  const envUrl = envUrlRaw?.replace(/\/+$/, '');
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];

  if (envUrl) {
    // If env contains localhost, rewrite it for Android emulator/device contexts.
    if (envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
      if (Platform.OS === 'android') {
        return host ? envUrl.replace('localhost', host).replace('127.0.0.1', host) : 'http://10.0.2.2:8000';
      }
    }
    return envUrl;
  }

  // Fallback: derive from Expo dev host if available.
  if (host) return `http://${host}:8000`;

  // Last fallback for local emulator/simulator development.
  return Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
}

const API_URL = resolveApiUrl();

console.log('Current API_URL is:', API_URL);

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
  const response = await fetch(`${API_URL}/api/profile/${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

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
  const response = await fetch(`${API_URL}/api/reviews/${encodeURIComponent(userId)}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(`Failed to load reviews: ${response.status} - ${errorData?.detail ?? response.statusText}`);
  }
  const data = await response.json();
  console.log('getProfileReviews response:', JSON.stringify(data));
  return data;
}
