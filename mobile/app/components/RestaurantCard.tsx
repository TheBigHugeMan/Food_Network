import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = SCREEN_W - 32; // full-width with 16px side padding

export type RestaurantCardProps = {
  name: string;
  cuisine: string;
  rating: number;
  photo_url: string | null;
  address: string;
  onPress?: () => void;
};

function StarRating({ rating }: { rating: number }) {
  const clamped = Math.min(5, Math.max(0, rating));
  const full = Math.floor(clamped);
  const half = clamped - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <View style={stars.row}>
      {Array.from({ length: full }).map((_, i) => (
        <Text key={`f${i}`} style={stars.full}>★</Text>
      ))}
      {half && <Text style={stars.full}>½</Text>}
      {Array.from({ length: empty }).map((_, i) => (
        <Text key={`e${i}`} style={stars.empty}>★</Text>
      ))}
      <Text style={stars.label}>{clamped.toFixed(1)}</Text>
    </View>
  );
}

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80';

export function RestaurantCard({
  name,
  cuisine,
  rating,
  photo_url,
  address,
  onPress,
}: RestaurantCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${cuisine}, rated ${rating} out of 5`}
    >
      <Image
        source={{ uri: photo_url ?? PLACEHOLDER }}
        style={styles.image}
        resizeMode="cover"
      />

      <View style={styles.badge}>
        <Text style={styles.badgeText}>{cuisine}</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>

        <StarRating rating={rating} />

        <View style={styles.addressRow}>
          <Text style={styles.pin}>📍</Text>
          <Text style={styles.address} numberOfLines={1}>
            {address}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: '#f0f0f0',
  },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  body: {
    padding: 14,
    gap: 6,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pin: {
    fontSize: 13,
  },
  address: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
});

const stars = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  full: {
    color: '#F5A623',
    fontSize: 16,
  },
  empty: {
    color: '#ddd',
    fontSize: 16,
  },
  label: {
    marginLeft: 4,
    fontSize: 13,
    color: '#555',
    fontWeight: '600',
  },
});
