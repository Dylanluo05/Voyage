import { useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { isNative } from '../utils/native';

interface Options {
  /** Called with a Google OAuth access token (what POST /api/auth/google expects). */
  onToken: (accessToken: string) => void | Promise<void>;
  onError: () => void;
}

let nativeInit: Promise<void> | null = null;

/** Configure the native Google plugin once per app launch. */
function initNativeGoogle(): Promise<void> {
  nativeInit ??= import('@capgo/capacitor-social-login').then(({ SocialLogin }) =>
    SocialLogin.initialize({
      google: {
        webClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        iOSClientId: import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID,
        mode: 'online',
      },
    })
  ).catch(err => {
    nativeInit = null; // allow a retry on the next tap
    throw err;
  });
  return nativeInit;
}

/**
 * Google sign-in that works on both surfaces: the web popup via @react-oauth/google,
 * and the native account sheet inside the Capacitor app (popups don't work in a
 * native webview). Both paths yield an access token for the existing backend endpoint.
 */
export function useGoogleSignIn({ onToken, onError }: Options): () => void {
  const webLogin = useGoogleLogin({
    onSuccess: ({ access_token }) => void onToken(access_token),
    onError,
  });

  return useCallback(() => {
    if (!isNative) {
      webLogin();
      return;
    }
    void (async () => {
      try {
        await initNativeGoogle();
        const { SocialLogin } = await import('@capgo/capacitor-social-login');
        const { result } = await SocialLogin.login({
          provider: 'google',
          options: { scopes: ['email', 'profile'] },
        });
        const token = 'accessToken' in result ? result.accessToken?.token : undefined;
        if (!token) throw new Error('No access token returned');
        await onToken(token);
      } catch (err) {
        // Closing the account sheet isn't an error worth surfacing.
        const msg = err instanceof Error ? err.message.toLowerCase() : '';
        if (msg.includes('cancel') || msg.includes('dismiss')) return;
        onError();
      }
    })();
  }, [webLogin, onToken, onError]);
}
