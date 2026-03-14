import { StyleSheet, Text, View, Pressable } from 'react-native';
import { supabase } from '../../lib/supabase';

export function LoginScreen() {
  const handleGoogleSignIn = async () => {
    // TODO: Implement Google OAuth with Supabase
    // For now, placeholder - you'll need expo-auth-session or Supabase's signInWithOAuth
    console.log('Google sign in - implement with Supabase signInWithOAuth');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Food Network</Text>
      <Text style={styles.subtitle}>AI-powered restaurant discovery</Text>
      <Pressable style={styles.button} onPress={handleGoogleSignIn}>
        <Text style={styles.buttonText}>Sign in with Google</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 48,
  },
  button: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
