/**
 * API client for Food Network backend
 * Set EXPO_PUBLIC_API_URL in .env (e.g. http://localhost:8000 or your Render URL)
 */

// Temporarily hardcode the IP address since the .env file isn't being picked up
const API_URL = 'http://118.139.16.252:8000';

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
