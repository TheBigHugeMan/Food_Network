import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
  Dimensions,
} from 'react-native';
import { signInWithGoogle } from '../../lib/auth-utils';

const { width } = Dimensions.get('window');

export function LoginScreen() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    setLoading(false);
    if (error) {
      Alert.alert('Sign in failed', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#e85d26" />

      {/* Top hero section */}
      <View style={styles.hero}>
        {/* Logo / icon */}
        <View style={styles.logoWrapper}>
          <Text style={styles.logoEmoji}>🍽️</Text>
        </View>
        <Text style={styles.appName}>Food Network</Text>
        <Text style={styles.tagline}>Discover great restaurants,{'\n'}powered by AI</Text>
      </View>

      {/* Feature highlights */}
      <View style={styles.features}>
        <FeatureRow icon="🔍" label="AI-powered search" desc="Describe what you're craving in plain English" />
        <FeatureRow icon="🗺️" label="Map view" desc="See top picks near you on an interactive map" />
        <FeatureRow icon="👥" label="Social" desc="Share favourites and see what friends are eating" />
      </View>

      {/* Sign in section */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.googleButton,
            pressed && styles.googleButtonPressed,
            loading && styles.googleButtonDisabled,
          ]}
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#444" size="small" />
          ) : (
            <>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.legal}>
          By continuing, you agree to our{' '}
          <Text style={styles.legalLink}>Terms</Text>
          {' '}and{' '}
          <Text style={styles.legalLink}>Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );
}

function FeatureRow({ icon, label, desc }: { icon: string; label: string; desc: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIconWrapper}>
        <Text style={styles.featureIcon}>{icon}</Text>
      </View>
      <View style={styles.featureText}>
        <Text style={styles.featureLabel}>{label}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  /* Hero */
  hero: {
    backgroundColor: '#e85d26',
    paddingTop: 72,
    paddingBottom: 48,
    paddingHorizontal: 32,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoEmoji: {
    fontSize: 40,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 24,
  },

  /* Features */
  features: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#fff5f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 22,
  },
  featureText: {
    flex: 1,
  },
  featureLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },

  /* Footer */
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
    gap: 12,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButtonPressed: {
    backgroundColor: '#f5f5f5',
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: '900',
    color: '#4285F4',
    fontStyle: 'italic',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  legal: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    color: '#e85d26',
    fontWeight: '600',
  },
});
