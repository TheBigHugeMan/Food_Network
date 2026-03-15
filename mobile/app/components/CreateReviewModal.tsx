import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../lib/auth-context';
import { getRestaurants, createReview, type RestaurantOption } from '../../lib/api';

type Props = {
  visible: boolean;
  onClose: () => void;
};

function StarRatingInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={starStyles.row}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} style={starStyles.touch}>
          <Text style={[starStyles.star, n <= value ? starStyles.filled : starStyles.empty]}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function CreateReviewModal({ visible, onClose }: Props) {
  const { session } = useAuth();
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState(3);
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setLoadingRestaurants(true);
      getRestaurants()
        .then(setRestaurants)
        .catch((e) => {
          console.error(e);
          Alert.alert('Error', 'Could not load restaurants.');
        })
        .finally(() => setLoadingRestaurants(false));
    }
  }, [visible]);

  const resetForm = () => {
    setSelectedRestaurantId(null);
    setDescription('');
    setRating(3);
    setImageUri(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to add a review image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    const profileId = session?.user?.id;
    if (!profileId) {
      Alert.alert('Error', 'You must be logged in to submit a review.');
      return;
    }
    if (!selectedRestaurantId) {
      Alert.alert('Missing info', 'Please select a restaurant.');
      return;
    }
    if (!imageUri) {
      Alert.alert('Missing photo', 'Please add a photo to your review.');
      return;
    }

    setSubmitting(true);
    try {
      await createReview(profileId, selectedRestaurantId, description, rating, imageUri);
      Alert.alert('Done', 'Your review was submitted.');
      handleClose();
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e?.message || 'Could not submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedName = restaurants.find((r) => r.id === selectedRestaurantId)?.name ?? 'Select restaurant';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Review</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* Restaurant */}
            <Text style={styles.label}>Restaurant</Text>
            {loadingRestaurants ? (
              <ActivityIndicator size="small" color="#e85d26" style={styles.loader} />
            ) : (
              <View style={styles.restaurantList}>
                <Pressable
                  style={[styles.restaurantRow, !selectedRestaurantId && styles.restaurantRowPlaceholder]}
                  onPress={() => {}}
                >
                  <Text style={styles.restaurantRowText} numberOfLines={1}>{selectedName}</Text>
                </Pressable>
                {restaurants.map((r) => (
                  <Pressable
                    key={r.id}
                    style={[styles.restaurantRow, selectedRestaurantId === r.id && styles.restaurantRowSelected]}
                    onPress={() => setSelectedRestaurantId(r.id)}
                  >
                    <Text style={styles.restaurantRowText} numberOfLines={1}>{r.name}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Description */}
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              placeholder="How was it?"
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            {/* Rating */}
            <Text style={styles.label}>Rating</Text>
            <StarRatingInput value={rating} onChange={setRating} />

            {/* Photo */}
            <Text style={styles.label}>Photo</Text>
            <Pressable style={styles.photoBox} onPress={pickImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.photoImage} resizeMode="cover" />
              ) : (
                <Text style={styles.photoPlaceholder}>Tap to add photo</Text>
              )}
            </Pressable>

            <View style={styles.actions}>
              <Pressable
                style={[styles.submitBtn, submitting && styles.submitDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitText}>Submit Review</Text>
                )}
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={handleClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const starStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  touch: { padding: 4 },
  star: { fontSize: 28 },
  filled: { color: '#F5A623' },
  empty: { color: '#ddd' },
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  close: { fontSize: 22, color: '#666' },
  body: { padding: 20, paddingBottom: 32 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  loader: { marginVertical: 8 },
  restaurantList: { marginBottom: 16 },
  restaurantRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginBottom: 6,
  },
  restaurantRowPlaceholder: { borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed' },
  restaurantRowSelected: { backgroundColor: '#fff0eb', borderWidth: 1, borderColor: '#e85d26' },
  restaurantRowText: { fontSize: 15, color: '#1a1a1a' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  photoBox: {
    height: 160,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    marginBottom: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoImage: { width: '100%', height: '100%' },
  photoPlaceholder: { color: '#999', fontSize: 15 },
  actions: { gap: 10 },
  submitBtn: {
    backgroundColor: '#e85d26',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: '#666', fontSize: 15 },
});
