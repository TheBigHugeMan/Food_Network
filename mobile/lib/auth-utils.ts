import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from './supabase';

/**
 * Sign in with Google using Supabase OAuth.
 * Opens a browser for the user to sign in, then captures the redirect and sets the session.
 */
export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  try {
    // Use default redirect (exp:// for Expo Go, foodnetwork:// for dev builds)
    const redirectUrl = AuthSession.makeRedirectUri({
      scheme: 'foodnetwork',
      path: 'auth/callback',
      preferLocalhost: false,
    });

    console.log('🔑 OAuth redirect URL:', redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      return { error };
    }

    if (!data.url) {
      return { error: new Error('No OAuth URL returned') };
    }

    console.log('🌐 Opening OAuth URL:', data.url);

    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectUrl,
      { showInRecents: true }
    );

    if (result.type !== 'success' || !result.url) {
      return { error: new Error('Sign-in was cancelled or failed') };
    }

    const url = result.url;
    const hashPart = url.includes('#') ? url.split('#')[1] : '';
    const queryPart = url.includes('?') ? url.split('?')[1]?.split('#')[0] ?? '' : '';
    const params = new URLSearchParams(hashPart || queryPart);

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) {
      return { error: new Error('Missing tokens in redirect') };
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError) {
      return { error: sessionError };
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}
