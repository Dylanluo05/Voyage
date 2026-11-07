import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isNative, closeExternal } from '../utils/native';

/** `voyage://open?path=%2Ftrips%2F123%3Fx%3D1` -> `/trips/123?x=1`, or null if it isn't a safe in-app path. */
function pathFromAppUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'voyage:') return null;
    const path = url.searchParams.get('path');
    // Internal paths only: must start with a single slash (no "//host" or "/\host" tricks).
    return path && /^\/(?![/\\])/.test(path) ? path : null;
  } catch {
    return null;
  }
}

/**
 * Handles `voyage://` links in the native app: Spotify and Stripe send the user back this way after
 * an external page. Closes the in-app browser and navigates to the requested screen.
 */
export default function NativeLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNative) return;
    let remove: (() => void) | undefined;
    let cancelled = false;

    void import('@capacitor/app').then(async ({ App }) => {
      const handle = await App.addListener('appUrlOpen', ({ url }) => {
        const path = pathFromAppUrl(url);
        if (!path) return;
        void closeExternal();
        navigate(path);
      });
      if (cancelled) void handle.remove();
      else remove = () => void handle.remove();
    });

    return () => {
      cancelled = true;
      remove?.();
    };
  }, [navigate]);

  return null;
}
