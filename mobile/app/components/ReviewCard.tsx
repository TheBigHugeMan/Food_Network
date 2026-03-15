import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import type { Review } from '../../lib/api';

const SCREEN_W = Dimensions.get('window').width;

type ReviewCardProps = { review: Review };

function StarRow({ rating }: { rating: number }) {
  return (
    <View style={stars.row}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Text key={n} style={n <= rating ? stars.filled : stars.empty}>★</Text>
      ))}
    </View>
  );
}

export function ReviewCard({ review }: ReviewCardProps) {
  const date = new Date(review.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <View style={styles.card}>
      {review.image_url ? (
        <Image source={{ uri: review.image_url }} style={styles.image} resizeMode="cover" />
      ) : null}
      <View style={styles.body}>
        <Text style={styles.restaurant} numberOfLines={1}>{review.restaurant_name}</Text>
        <StarRow rating={review.rating} />
        {review.description ? (
          <Text style={styles.description} numberOfLines={4}>{review.description}</Text>
        ) : null}
        <Text style={styles.date}>{date}</Text>
      </View>
    </View>
  );
}

const stars = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 6 },
  filled: { fontSize: 16, color: '#e85d26', marginRight: 2 },
  empty:  { fontSize: 16, color: '#e0e0e0', marginRight: 2 },
});

const styles = StyleSheet.create({
  card: {
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
  image: {
    width: '100%',
    height: 180,
    backgroundColor: '#f0f0f0',
  },
  body: {
    padding: 14,
  },
  restaurant: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: '#bbb',
    marginTop: 2,
  },
});
