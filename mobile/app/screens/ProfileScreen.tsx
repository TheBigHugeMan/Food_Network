import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { RadarChart } from '@salmonco/react-native-radar-chart';
import { uploadProfileImage } from '../lib/api';
import mockUser from '../data/mockUser.json';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = (SCREEN_W - 48 - 12) / 4; // 4 cards, 16px side padding, 4 gaps of 4

export function ProfileScreen() {
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to change your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri); // Optimistic UI update
      
      try {
        const response = await uploadProfileImage(uri, (mockUser as any).id || 'test-user-id');
        setAvatarUri(response.avatar_url); // Switch to the official backend URL
      } catch (error) {
        console.error('Failed to upload image:', error);
        Alert.alert('Upload Error', 'Could not save profile image to the backend.');
      }
    }
  };

  const maxCuisineCount = Math.max(...mockUser.cuisineFrequency.map((c) => c.count));

  const radarData = [
    { label: 'Bitter', value: mockUser.tasteProfile.bitter },
    { label: 'Umami',  value: mockUser.tasteProfile.umami  },
    { label: 'Sour',   value: mockUser.tasteProfile.sour   },
    { label: 'Sweet',  value: mockUser.tasteProfile.sweet  },
    { label: 'Salty',  value: mockUser.tasteProfile.salty  },
  ];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>

      {/* ── Avatar + name ── */}
      <View style={styles.header}>
        <Pressable onPress={pickImage} style={styles.avatarWrapper}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>{mockUser.name[0]}</Text>
            </View>
          )}
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>✎</Text>
          </View>
        </Pressable>
        <Text style={styles.name}>{mockUser.name}</Text>
        <Text style={styles.username}>{mockUser.username}</Text>
      </View>

      {/* ── Stats ── */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{mockUser.friendsCount}</Text>
          <Text style={styles.statLabel}>Friends</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{mockUser.restaurantVisits}</Text>
          <Text style={styles.statLabel}>Visits</Text>
        </View>
      </View>

      {/* ── Bio ── */}
      <View style={styles.section}>
        <Text style={styles.bio}>{mockUser.bio}</Text>
      </View>

      <View style={styles.divider} />

      {/* ── Top 4 Restaurants (Letterboxd-style) ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Restaurants</Text>
        <View style={styles.topRow}>
          {mockUser.topRestaurants.map((r) => (
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

      <View style={styles.divider} />

      {/* ── Taste Profile radar ── */}
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

      <View style={styles.divider} />

      {/* ── Cuisine frequency bar chart ── */}
      <View style={[styles.section, styles.lastSection]}>
        <Text style={styles.sectionTitle}>Favourite Cuisines</Text>
        {mockUser.cuisineFrequency.map((item) => (
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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    paddingBottom: 40,
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
  bio: {
    fontSize: 14,
    color: '#444',
    lineHeight: 21,
    textAlign: 'center',
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
});
