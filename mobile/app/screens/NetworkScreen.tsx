import { StyleSheet, Text, View } from 'react-native';

export function NetworkScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Network – coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  placeholder: { color: '#999', fontSize: 16 },
});
