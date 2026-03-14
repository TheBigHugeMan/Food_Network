import { StyleSheet, Text, View } from 'react-native';

export function FriendsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Friends – coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  placeholder: { color: '#999', fontSize: 16 },
});
