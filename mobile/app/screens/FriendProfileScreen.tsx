import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getProfileById, getReviewsByUserId, type Profile, type Review } from '../../lib/friends';

type FriendsStackParamList = { FriendsList: undefined; FriendProfile: { userId: string } };
type Props = NativeStackScreenProps<FriendsStackParamList, 'FriendProfile'>;

export function FriendProfileScreen({ route }: Props) {
  const { userId } = route.params;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const { width: SCREEN_W } = useWindowDimensions();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [p, r] = await Promise.all([getProfileById(userId), getReviewsByUserId(userId)]);
      if (!cancelled) {
        setProfile(p ?? null);
        setReviews(r);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e85d26" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.placeholder}>Profile not found</Text>
      </View>
    );
  }

  const displayName = profile.display_name || profile.username || 'Friend';
  const username = profile.username ? (profile.username.startsWith('@') ? profile.username : `@${profile.username}`) : '';

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        {profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>{displayName[0]?.toUpperCase() || '?'}</Text>
          </View>
        )}
        <Text style={styles.name}>{displayName}</Text>
        {username ? <Text style={styles.username}>{username}</Text> : null}
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reviews</Text>
        {reviews.length === 0 ? (
          <Text style={styles.empty}>No reviews yet</Text>
        ) : (
          reviews.map((rev) => (
            <View key={rev.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewRestaurant} numberOfLines={1}>
                  {rev.restaurant_name || rev.place_id || 'Restaurant'}
                </Text>
                <Text style={styles.reviewRating}>★ {rev.rating.toFixed(1)}</Text>
              </View>
              {rev.body ? (
                <Text style={styles.reviewBody} numberOfLines={4}>{rev.body}</Text>
              ) : null}
              <Text style={styles.reviewDate}>
                {new Date(rev.created_at).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#fff' },
  container: { paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  placeholder: { color: '#999', fontSize: 16 },
  header: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#e85d26',
    marginBottom: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#e85d26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 38, fontWeight: '700', color: '#fff' },
  name: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  username: { fontSize: 14, color: '#888', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginHorizontal: 16 },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  empty: { color: '#999', fontSize: 14 },
  reviewCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewRestaurant: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', flex: 1 },
  reviewRating: { fontSize: 14, color: '#e85d26', fontWeight: '600' },
  reviewBody: { fontSize: 14, color: '#444', lineHeight: 20 },
  reviewDate: { fontSize: 12, color: '#888', marginTop: 8 },
});
