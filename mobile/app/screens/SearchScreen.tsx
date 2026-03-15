import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useAuth } from '../../lib/auth-context';
import { searchRestaurants, type Restaurant } from '../../lib/api';
import { RestaurantCard } from '../components/RestaurantCard';

type LocationState =
  | { status: 'pending' }
  | { status: 'granted'; latitude: number; longitude: number; suburb?: string }
  | { status: 'denied' };

export function SearchScreen() {
  const route = useRoute<any>();
  const { session } = useAuth();

  const initialQuery: string = route.params?.initialQuery ?? '';

  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Restaurant[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationState, setLocationState] = useState<LocationState>({ status: 'pending' });

  // Tracks whether the auto-search for an initialQuery has already fired
  const autoSearchFired = useRef(false);

  // Request device location on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!cancelled) setLocationState({ status: 'denied' });
        return;
      }
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        let detectedSuburb: string | undefined;
        try {
          const [geo] = await Location.reverseGeocodeAsync({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          detectedSuburb = geo?.district ?? geo?.subregion ?? geo?.city ?? undefined;
        } catch {
          // reverse geocode failure is non-fatal
        }
        if (!cancelled)
          setLocationState({
            status: 'granted',
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            suburb: detectedSuburb,
          });
      } catch {
        if (!cancelled) setLocationState({ status: 'denied' });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-fire search when location resolves and screen was opened with a query
  useEffect(() => {
    if (
      initialQuery &&
      locationState.status !== 'pending' &&
      !autoSearchFired.current
    ) {
      autoSearchFired.current = true;
      executeSearch(initialQuery, locationState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationState.status]);

  /** Core search logic – accepts explicit parameters to avoid stale closures. */
  const executeSearch = async (searchQuery: string, loc: LocationState) => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      Alert.alert('Enter a search', "Type what you're looking for first.");
      return;
    }

    const accessToken = session?.access_token;
    if (!accessToken) {
      Alert.alert('Sign in required', 'Please sign in to search for restaurants.');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setSearched(true);

    try {
      const hasCoords = loc.status === 'granted';
      const resolvedSuburb = hasCoords ? (loc as any).suburb : undefined;
      const response = await searchRestaurants(
        trimmedQuery,
        accessToken,
        hasCoords ? (loc as any).latitude : undefined,
        hasCoords ? (loc as any).longitude : undefined,
        resolvedSuburb,
      );
      setResults(response.top_restaurants);
    } catch (e: any) {
      setError(e?.message ?? 'Could not fetch results. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => executeSearch(query, locationState);

  return (
    <View style={styles.container}>
      {/* Location confirmed banner */}
      {locationState.status === 'granted' && (
        <View style={styles.locationBanner}>
          <Text style={styles.locationBannerText}>📍 Using your current location</Text>
        </View>
      )}

      {/* Search bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder={
            locationState.status === 'denied'
              ? 'e.g. spicy Thai in Fitzroy'
              : 'e.g. spicy Thai near me'
          }
          value={query}
          onChangeText={setQuery}
          editable={!loading}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <Pressable
          style={[styles.searchButton, loading && styles.buttonDisabled]}
          onPress={handleSearch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.searchButtonText}>Search</Text>
          )}
        </Pressable>
      </View>

      {/* Results list */}
      <ScrollView style={styles.results} showsVerticalScrollIndicator={false}>
        {loading && <ActivityIndicator size="large" color="#4285F4" style={styles.loader} />}

        {!loading && error && <Text style={styles.errorText}>{error}</Text>}

        {!loading && !error && results.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Top {results.length} Results</Text>
            {results.map((r) => (
              <RestaurantCard
                key={r.place_id}
                name={r.name}
                cuisine={r.cuisine ?? 'Restaurant'}
                rating={r.rating ?? 0}
                photo_url={r.photo_url ?? null}
                address={r.address ?? ''}
              />
            ))}
          </>
        )}

        {!loading && !error && results.length === 0 && searched && (
          <Text style={styles.placeholder}>No results found. Try a different search.</Text>
        )}

        {!loading && !error && !searched && (
          <Text style={styles.placeholder}>
            {locationState.status === 'pending'
              ? 'Requesting location…'
              : 'Type a query and tap Search to find restaurants nearby.'}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  locationBanner: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  locationBannerText: { fontSize: 13, color: '#2e7d32', fontWeight: '500' },
  searchBar: { flexDirection: 'row', gap: 8, marginBottom: 16 },
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
  buttonDisabled: { opacity: 0.6 },
  searchButtonText: { color: '#fff', fontWeight: '600' },
  results: { flex: 1 },
  loader: { marginTop: 48 },
  errorText: { color: '#c0392b', textAlign: 'center', marginTop: 32, fontSize: 15 },
  placeholder: { color: '#999', textAlign: 'center', marginTop: 48, fontSize: 15 },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
});

