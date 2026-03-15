import { View, Text, StyleSheet } from 'react-native';
import type { RestaurantRecommendation } from '../../lib/api';

export type RestaurantRecommendationCardProps = {
  recommendation: RestaurantRecommendation;
};

function StarRating({ rating }: { rating: number }) {
  const clamped = Math.min(5, Math.max(0, rating));
  const full = Math.floor(clamped);
  const empty = 5 - full;
  return (
    <View style={starStyles.row}>
      {Array.from({ length: full }).map((_, i) => (
        <Text key={`f${i}`} style={starStyles.full}>★</Text>
      ))}
      {Array.from({ length: empty }).map((_, i) => (
        <Text key={`e${i}`} style={starStyles.empty}>★</Text>
      ))}
      <Text style={starStyles.label}>{clamped.toFixed(1)}</Text>
    </View>
  );
}

export function RestaurantRecommendationCard({ recommendation }: RestaurantRecommendationCardProps) {
  const { name, address, cuisine, rating, reasoning } = recommendation;
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {cuisine ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{cuisine}</Text>
          </View>
        ) : null}
      </View>
      {rating != null && (
        <StarRating rating={rating} />
      )}
      {address ? (
        <View style={styles.addressRow}>
          <Text style={styles.pin}>📍</Text>
          <Text style={styles.address} numberOfLines={2}>{address}</Text>
        </View>
      ) : null}
      {reasoning ? (
        <Text style={styles.reasoning}>{reasoning}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
  },
  badge: {
    backgroundColor: '#e85d26',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 4,
  },
  pin: {
    fontSize: 12,
  },
  address: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  reasoning: {
    fontSize: 12,
    color: '#6d6d6d',
    fontStyle: 'italic',
    marginTop: 6,
  },
});

const starStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  full: {
    color: '#F5A623',
    fontSize: 14,
  },
  empty: {
    color: '#ddd',
    fontSize: 14,
  },
  label: {
    marginLeft: 4,
    fontSize: 12,
    color: '#555',
    fontWeight: '600',
  },
});
