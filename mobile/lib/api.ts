/**
 * API client for Food Network backend
 * Set EXPO_PUBLIC_API_URL in .env (e.g. http://localhost:8000 or your Render URL)
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

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
  latitude: number,
  longitude: number
): Promise<SearchResponse> {
  const response = await fetch(`${API_URL}/api/restaurants/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      query,
      latitude,
      longitude,
    }),
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status}`);
  }

  return response.json();
}
