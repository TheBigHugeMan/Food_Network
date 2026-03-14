import { StyleSheet, Text, View } from 'react-native';

export function NetworkScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Network</Text>
      <Text style={styles.subtitle}>Your network will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
  },
});
