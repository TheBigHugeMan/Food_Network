import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RestaurantCard } from '../components/RestaurantCard';
import { CreateReviewModal } from '../components/CreateReviewModal';

const MOCK_RECOMMENDATIONS = [
  {
    id: '1',
    name: 'Sakura Ramen',
    cuisine: 'Japanese',
    rating: 4.7,
    photo_url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=80',
    address: '123 Main St, San Francisco, CA',
  },
  {
    id: '2',
    name: 'Bella Italia',
    cuisine: 'Italian',
    rating: 4.3,
    photo_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80',
    address: '456 Columbus Ave, San Francisco, CA',
  },
  {
    id: '3',
    name: 'Spice Garden',
    cuisine: 'Indian',
    rating: 4.5,
    photo_url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80',
    address: '789 Mission St, San Francisco, CA',
  },
];

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [reviewModalVisible, setReviewModalVisible] = useState(false);

  const handleSearch = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    navigation.navigate('Search', { initialQuery: trimmed });
  };

  const recommendations = MOCK_RECOMMENDATIONS;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="e.g. spicy Thai near me"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <Pressable
          style={styles.searchButton}
          onPress={handleSearch}
        >
          <Text style={styles.searchButtonText}>Search</Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.createReviewButton}
        onPress={() => setReviewModalVisible(true)}
      >
        <Text style={styles.createReviewButtonText}>Create Review</Text>
      </Pressable>

      <ScrollView style={styles.results} showsVerticalScrollIndicator={false}>
        <>
          <Text style={styles.sectionLabel}>Recommended for You</Text>
          {recommendations.map((r) => (
            <RestaurantCard
              key={r.id}
              name={r.name}
              cuisine={r.cuisine}
              rating={r.rating}
              photo_url={r.photo_url}
              address={r.address}
            />
          ))}
        </>
      </ScrollView>

      <CreateReviewModal
        visible={reviewModalVisible}
        onClose={() => setReviewModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  createReviewButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#e85d26',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  createReviewButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: 8,
  },
  searchButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  results: { flex: 1 },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
});
