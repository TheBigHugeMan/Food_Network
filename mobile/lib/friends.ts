/**
 * Friends, friend requests, and reviews via Supabase.
 */

import { supabase } from './supabase';

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  friends: string[];
};

export type FriendRequest = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  created_at: string;
  sender?: Profile;
};

export type Review = {
  id: string;
  user_id: string;
  place_id: string;
  restaurant_name: string | null;
  rating: number;
  body: string | null;
  created_at: string;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseFriendsArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((id) => typeof id === 'string' && UUID_REGEX.test(id));
  }
  if (typeof raw === 'string') {
    const trimmed = raw.replace(/^\{|\}$/g, '').trim();
    if (!trimmed) return [];
    return trimmed.split(',').map((s) => s.trim()).filter((id) => UUID_REGEX.test(id));
  }
  return [];
}

export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, friends')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    username: data.username ?? null,
    display_name: data.display_name ?? null,
    avatar_url: data.avatar_url ?? null,
    friends: parseFriendsArray(data.friends),
  };
}

export async function getProfilesByIds(ids: string[]): Promise<Profile[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, friends')
    .in('id', ids);
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    username: row.username ?? null,
    display_name: row.display_name ?? null,
    avatar_url: row.avatar_url ?? null,
    friends: parseFriendsArray(row.friends),
  }));
}

/** Friends = people you have an *accepted* friend request with (from friend_requests table, not profiles.friends). */
export async function getMyFriendsList(userId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('from_user_id, to_user_id')
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .eq('status', 'accepted');
  if (error || !data || data.length === 0) return [];
  const friendIds = [...new Set(data.map((row) => (row.from_user_id === userId ? row.to_user_id : row.from_user_id)))];
  if (friendIds.length === 0) return [];
  return getProfilesByIds(friendIds);
}

export async function getPendingReceivedRequests(userId: string): Promise<FriendRequest[]> {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('id, from_user_id, to_user_id, status, created_at')
    .eq('to_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error || !data || data.length === 0) return [];
  const senderIds = [...new Set(data.map((r) => r.from_user_id))];
  const profiles = await getProfilesByIds(senderIds);
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  return data.map((row) => ({
    id: row.id,
    from_user_id: row.from_user_id,
    to_user_id: row.to_user_id,
    status: row.status,
    created_at: row.created_at,
    sender: profileMap.get(row.from_user_id),
  }));
}

export async function sendFriendRequest(fromUserId: string, toUserId: string): Promise<{ ok: boolean; error?: string }> {
  if (fromUserId === toUserId) return { ok: false, error: "You can't add yourself." };
  const myProfile = await getMyProfile(fromUserId);
  if (myProfile?.friends.includes(toUserId)) return { ok: false, error: 'Already friends.' };
  const { error } = await supabase.from('friend_requests').insert({
    from_user_id: fromUserId,
    to_user_id: toUserId,
    status: 'pending',
  });
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Request already sent or already friends.' };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function acceptFriendRequest(requestId: string, myUserId: string): Promise<{ ok: boolean; error?: string }> {
  const { data: req, error: fetchErr } = await supabase
    .from('friend_requests')
    .select('from_user_id, to_user_id')
    .eq('id', requestId)
    .eq('to_user_id', myUserId)
    .eq('status', 'pending')
    .single();
  if (fetchErr || !req) return { ok: false, error: 'Request not found or already handled.' };
  const otherId = req.from_user_id;

  const { data: myProfile } = await supabase.from('profiles').select('friends').eq('id', myUserId).single();
  const { data: otherProfile } = await supabase.from('profiles').select('friends').eq('id', otherId).single();
  const myFriends: string[] = Array.isArray(myProfile?.friends) ? myProfile.friends : [];
  const otherFriends: string[] = Array.isArray(otherProfile?.friends) ? otherProfile.friends : [];
  if (myFriends.includes(otherId)) {
    await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId);
    return { ok: true };
  }

  const newMyFriends = [...myFriends, otherId];
  const newOtherFriends = [...otherFriends, myUserId];

  const [{ error: updateReqErr }, { error: updateMyErr }, { error: updateOtherErr }] = await Promise.all([
    supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId),
    supabase.from('profiles').update({ friends: newMyFriends, updated_at: new Date().toISOString() }).eq('id', myUserId),
    supabase.from('profiles').update({ friends: newOtherFriends, updated_at: new Date().toISOString() }).eq('id', otherId),
  ]);
  if (updateReqErr || updateMyErr || updateOtherErr) {
    return { ok: false, error: updateReqErr?.message || updateMyErr?.message || updateOtherErr?.message || 'Failed to accept.' };
  }
  return { ok: true };
}

export async function declineFriendRequest(requestId: string, myUserId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'declined' })
    .eq('id', requestId)
    .eq('to_user_id', myUserId)
    .eq('status', 'pending');
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Find a profile by display name (for add friend). Uses display_name from profile (set from Google name or email prefix). */
export async function findProfileByDisplayName(displayName: string): Promise<Profile | null> {
  const normalized = displayName.trim();
  if (!normalized) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, friends')
    .ilike('display_name', `%${normalized}%`)
    .limit(5);
  if (error || !data || data.length === 0) return null;
  const lower = normalized.toLowerCase();
  const exact = data.find((r) => (r.display_name ?? '').toLowerCase() === lower);
  const row = exact ?? data[0];
  return {
    id: row.id,
    username: row.username ?? null,
    display_name: row.display_name ?? null,
    avatar_url: row.avatar_url ?? null,
    friends: Array.isArray(row.friends) ? row.friends : [],
  };
}

/** Placeholder until teammate's reviews feature exists – returns [] if table missing or error. */
export async function getReviewsByUserId(userId: string): Promise<Review[]> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, user_id, place_id, restaurant_name, rating, body, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      place_id: r.place_id,
      restaurant_name: r.restaurant_name ?? null,
      rating: r.rating,
      body: r.body ?? null,
      created_at: r.created_at,
    }));
  } catch {
    return [];
  }
}

export async function getProfileById(userId: string): Promise<Profile | null> {
  return getMyProfile(userId);
}
