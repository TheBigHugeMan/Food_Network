import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { RadarChart } from '@salmonco/react-native-radar-chart';
import { useAuth } from '../../lib/auth-context';
import { uploadProfileImage, getProfile, updateBio, getProfileReviews, UserProfile, Review } from '../../lib/api';
import { ReviewCard } from '../components/ReviewCard';
import { CreateReviewModal } from '../components/CreateReviewModal';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = (SCREEN_W - 48 - 12) / 4; // 4 cards, 16px side padding, 4 gaps of 4

export function ProfileScreen() {
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bioModalVisible, setBioModalVisible] = useState(false);
  const [bioText, setBioText] = useState('');
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const { session, signOut } = useAuth();

  useEffect(() => {
    if (!session) return;
    setIsLoading(true);
    // Use allSettled so a failing reviews fetch never blocks the profile from rendering
    Promise.allSettled([
      getProfile(session.user.id, session.access_token),
      getProfileReviews(session.user.id),
    ])
      .then(([profileResult, reviewsResult]) => {
        if (profileResult.status === 'fulfilled') {
          const data = profileResult.value;
          setProfile(data);
          if (data.avatar_url) setAvatarUri(data.avatar_url);
        } else {
          console.error('Failed to load profile:', profileResult.reason);
          Alert.alert('Error', 'Could not load profile data.');
        }
        if (reviewsResult.status === 'fulfilled') {
          setReviews(reviewsResult.value);
        } else {
          console.error('Failed to load reviews:', reviewsResult.reason);
        }
      })
      .finally(() => setIsLoading(false));
  }, [session]);

  const refreshReviews = useCallback(() => {
    if (!session) return;
    getProfileReviews(session.user.id)
      .then((data) => {
        console.log('Reviews refreshed:', data.length, 'items');
        setReviews(data);
      })
      .catch((err) => console.error('Failed to refresh reviews:', err));
  }, [session]);

  // Re-fetch reviews every time the Profile tab is focused (handles reviews
  // created from HomeScreen or anywhere else while the screen was inactive)
  useFocusEffect(
    useCallback(() => {
      refreshReviews();
    }, [refreshReviews])
  );

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  const pickImage = async () => {
    if (!session) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to change your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri); // Optimistic UI update
      try {
        const response = await uploadProfileImage(uri, session.user.id);
        setAvatarUri(response.avatar_url);
        setProfile((prev) => prev ? { ...prev, avatar_url: response.avatar_url } : prev);
      } catch (error) {
        console.error('Failed to upload image:', error);
        Alert.alert('Upload Error', 'Could not save profile image to the backend.');
      }
    }
  };

  const hasTasteProfile = !!profile?.taste_profile;
  const hasCuisineFrequency = !!(profile?.cuisine_frequency && profile.cuisine_frequency.length > 0);
  const hasTopRestaurants = !!(profile?.top_restaurants && profile.top_restaurants.length > 0);

  const maxCuisineCount = hasCuisineFrequency
    ? Math.max(...profile!.cuisine_frequency!.map((c) => c.count))
    : 1;

  const radarData = hasTasteProfile
    ? [
        { label: 'Bitter', value: profile!.taste_profile!.bitter },
        { label: 'Umami',  value: profile!.taste_profile!.umami  },
        { label: 'Sour',   value: profile!.taste_profile!.sour   },
        { label: 'Sweet',  value: profile!.taste_profile!.sweet  },
        { label: 'Salty',  value: profile!.taste_profile!.salty  },
      ]
    : [];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e85d26" />
      </View>
    );
  }

  return (
    <View style={styles.screenRoot}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>

      {/* ── Avatar + name ── */}
      <View style={styles.header}>
        <Pressable onPress={pickImage} style={styles.avatarWrapper}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {(profile?.display_name || profile?.username || '?')[0].toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>✎</Text>
          </View>
        </Pressable>
        <Text style={styles.name}>{profile?.display_name || profile?.username || 'Unknown'}</Text>
        <Text style={styles.username}>{profile?.username || ''}</Text>
      </View>

      {/* ── Stats ── */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{profile?.friends_count ?? 0}</Text>
          <Text style={styles.statLabel}>Friends</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{profile?.restaurant_visits ?? 0}</Text>
          <Text style={styles.statLabel}>Visits</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{reviews.length}</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* ── My Reviews ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Reviews ({reviews.length})</Text>
        {reviews.length === 0 ? (
          <Text style={styles.reviewsEmpty}>No reviews yet — tap + to write your first!</Text>
        ) : (
          reviews.map((r) => <ReviewCard key={r.id} review={r} />)
        )}
      </View>

      {/* ── Bio ── */}
      <View style={styles.section}>
        <View style={styles.bioRow}>
          {profile?.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : (
            <Text style={styles.bioPlaceholder}>No bio yet — tell people about yourself!</Text>
          )}
          <Pressable
            onPress={() => {
              setBioText(profile?.bio || '');
              setBioModalVisible(true);
            }}
            style={styles.bioEditButton}
          >
            <Text style={styles.bioEditButtonText}>{profile?.bio ? '✎' : '+ Add bio'}</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Bio edit modal ── */}
      <Modal
        visible={bioModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setBioModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{profile?.bio ? 'Edit Bio' : 'Add Bio'}</Text>
            <TextInput
              style={styles.bioInput}
              value={bioText}
              onChangeText={setBioText}
              placeholder="Write something about yourself…"
              placeholderTextColor="#aaa"
              multiline
              maxLength={300}
              autoFocus
            />
            <Text style={styles.bioCharCount}>{bioText.length}/300</Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setBioModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSave, isSavingBio && styles.modalBtnDisabled]}
                disabled={isSavingBio}
                onPress={async () => {
                  if (!session) return;
                  setIsSavingBio(true);
                  try {
                    await updateBio(session.user.id, bioText.trim(), session.access_token);
                    setProfile((prev) => prev ? { ...prev, bio: bioText.trim() } : prev);
                    setBioModalVisible(false);
                  } catch (err) {
                    console.error('Failed to save bio:', err);
                    Alert.alert('Error', 'Could not save bio. Please try again.');
                  } finally {
                    setIsSavingBio(false);
                  }
                }}
              >
                <Text style={styles.modalBtnSaveText}>{isSavingBio ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {hasTopRestaurants && (
        <>
          <View style={styles.divider} />
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Restaurants</Text>
            <View style={styles.topRow}>
              {profile!.top_restaurants!.map((r) => (
                <View key={r.id} style={[styles.restaurantCard, { backgroundColor: r.color }]}>
                  <View style={styles.cardOverlay}>
                    <Text style={styles.cardName} numberOfLines={3}>{r.name}</Text>
                    <Text style={styles.cardCuisine} numberOfLines={1}>{r.cuisine}</Text>
                    <Text style={styles.cardRating}>★ {r.rating.toFixed(1)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </>
      )}

      {hasTasteProfile && (
        <>
          <View style={styles.divider} />
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Taste Profile</Text>
            <View style={styles.radarWrapper}>
              <RadarChart
                data={radarData}
                maxValue={100}
                size={SCREEN_W - 64}
                gradientColor={{
                  startColor: '#FFE8DC',
                  endColor: '#FFCBA4',
                  count: 5,
                }}
                stroke={['#FFE0C7', '#FFCBA4', '#FFB377', '#FF9B54', '#e85d26']}
                strokeWidth={[0.5, 0.5, 0.5, 0.5, 1]}
                strokeOpacity={[1, 1, 1, 1, 1]}
                labelColor="#333333"
                dataFillColor="#e85d26"
                dataFillOpacity={0.35}
                dataStroke="#e85d26"
                dataStrokeWidth={2}
                divisionStroke="#ddd"
                divisionStrokeWidth={1}
              />
            </View>
          </View>
        </>
      )}

      {hasCuisineFrequency && (
        <>
          <View style={styles.divider} />
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Favourite Cuisines</Text>
            {profile!.cuisine_frequency!.map((item) => (
              <View key={item.cuisine} style={styles.barRow}>
                <Text style={styles.barLabel}>{item.cuisine}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${(item.count / maxCuisineCount) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.barCount}>{item.count}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <View style={styles.divider} />

      {/* ── Settings ── */}
      <View style={[styles.section, styles.lastSection]}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.menuCard}>
          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
            onPress={handleSignOut}
          >
            <Text style={styles.menuRowTextDanger}>Sign out</Text>
            <Text style={styles.menuRowChevron}>›</Text>
          </Pressable>
        </View>
      </View>

      </ScrollView>

      <Pressable style={styles.fab} onPress={() => setReviewModalVisible(true)}>
        <Text style={styles.fabText}>＋</Text>
      </Pressable>

      <CreateReviewModal
        visible={reviewModalVisible}
        onClose={() => setReviewModalVisible(false)}
        onCreated={() => { setReviewModalVisible(false); refreshReviews(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#fff',
  },
  screenRoot: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    paddingBottom: 100,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#e85d26',
  },
  avatarPlaceholder: {
    backgroundColor: '#e85d26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 38,
    fontWeight: '700',
    color: '#fff',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e85d26',
  },
  editBadgeText: {
    fontSize: 12,
    color: '#e85d26',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  username: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    marginHorizontal: 16,
    gap: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#e0e0e0',
  },

  // Sections
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  lastSection: {
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  bioRow: {
    alignItems: 'center',
    gap: 8,
  },
  bio: {
    fontSize: 14,
    color: '#444',
    lineHeight: 21,
    textAlign: 'center',
  },
  bioPlaceholder: {
    fontSize: 14,
    color: '#bbb',
    lineHeight: 21,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  bioEditButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e85d26',
  },
  bioEditButtonText: {
    fontSize: 12,
    color: '#e85d26',
    fontWeight: '600',
  },
  // Bio modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  bioInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1a1a1a',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  bioCharCount: {
    fontSize: 11,
    color: '#aaa',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#f5f5f5',
  },
  modalBtnCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
  },
  modalBtnSave: {
    backgroundColor: '#e85d26',
  },
  modalBtnSaveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  modalBtnDisabled: {
    opacity: 0.6,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
    marginTop: 20,
  },

  // Top Restaurants
  topRow: {
    flexDirection: 'row',
    gap: 8,
  },
  restaurantCard: {
    width: CARD_W,
    height: CARD_W * 1.5,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  cardOverlay: {
    backgroundColor: 'rgba(0,0,0,0.38)',
    padding: 6,
  },
  cardName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 13,
  },
  cardCuisine: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  cardRating: {
    fontSize: 10,
    color: '#FFD700',
    marginTop: 3,
    fontWeight: '600',
  },

  // Radar
  radarWrapper: {
    alignItems: 'center',
    marginTop: -8,
  },

  // Cuisine bars
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  barLabel: {
    width: 72,
    fontSize: 13,
    color: '#444',
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#e85d26',
    borderRadius: 5,
  },
  barCount: {
    width: 28,
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
  },

  // Settings / menu
  menuCard: {
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  menuRowPressed: {
    backgroundColor: '#fafafa',
  },
  menuRowTextDanger: {
    fontSize: 15,
    fontWeight: '500',
    color: '#e03d3d',
  },
  menuRowChevron: {
    fontSize: 20,
    color: '#ccc',
    lineHeight: 22,
  },
  // My Reviews
  reviewsEmpty: {
    fontSize: 14,
    color: '#bbb',
    textAlign: 'center',
    paddingVertical: 24,
    fontStyle: 'italic',
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e85d26',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    lineHeight: 32,
    fontWeight: '400',
  },
});
