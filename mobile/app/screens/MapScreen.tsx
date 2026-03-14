import { StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-maps';

export function MapScreen() {
  // Default to Cambridge, MA (or use user location)
  const region = {
    latitude: 42.3736,
    longitude: -71.1097,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={region} showsUserLocation />
      <View style={styles.overlay}>
        <Text style={styles.overlayText}>
          Map ready – pass restaurants from Search to show markers
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 12,
    borderRadius: 8,
  },
  overlayText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});
