import { useEffect, useRef } from 'react';
import { API_URL, getToken } from '../api/client';
import { isNative } from '../utils/native';

const MAX_RETRY_MS = 30_000;

/**
 * Live trip updates over SSE, resilient to what phones do to connections.
 *
 * - Each connection needs a fresh one-time token (EventSource can't send auth headers), so the
 *   browser's built-in auto-reconnect can't work: it would replay a spent token. We reconnect
 *   ourselves, fetching a new token each time, with exponential backoff and jitter.
 * - The connection is dropped when the page/app goes to the background and re-opened (immediately)
 *   when it comes back, or when the network returns.
 * - Anything can happen while disconnected, so every *re*connect also calls `onUpdate` once to
 *   catch up on missed changes.
 */
export function useTripLiveUpdates(tripId: string | undefined, onUpdate: () => void): void {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!tripId) return;

    let source: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let connecting = false;
    let hasConnected = false;
    let stopped = false; // effect cleaned up (or auth failed): never reconnect
    let paused = document.hidden; // page/app in the background: stay disconnected

    function disconnect() {
      clearTimeout(retryTimer);
      retryTimer = undefined;
      source?.close();
      source = null;
    }

    function scheduleRetry() {
      if (stopped || paused) return; // resume/online handlers will reconnect
      clearTimeout(retryTimer);
      const delay = Math.min(MAX_RETRY_MS, 1000 * 2 ** attempt) + Math.random() * 500;
      attempt += 1;
      retryTimer = setTimeout(() => void connect(), delay);
    }

    async function connect() {
      if (stopped || paused || connecting || source) return;
      const token = getToken();
      if (!token) return;
      connecting = true;
      try {
        const res = await fetch(`${API_URL}/api/trips/${tripId}/sse-token`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403 || res.status === 404) {
          stopped = true; // signed out, or no access to this trip: retrying won't help
          return;
        }
        if (!res.ok) throw new Error(`sse-token ${res.status}`);
        const { token: sseToken } = (await res.json()) as { token: string };
        // The page may have been backgrounded or unmounted while we were waiting.
        if (stopped || paused) return;

        const es = new EventSource(`${API_URL}/api/trips/${tripId}/events?token=${encodeURIComponent(sseToken)}`);
        source = es;
        es.onopen = () => {
          attempt = 0;
          if (hasConnected) onUpdateRef.current(); // catch up on whatever we missed
          hasConnected = true;
        };
        es.addEventListener('updated', () => onUpdateRef.current());
        es.onerror = () => {
          // The token is spent, so let the browser's own retry die and start over with a new one.
          es.close();
          if (source === es) source = null;
          scheduleRetry();
        };
      } catch {
        scheduleRetry();
      } finally {
        connecting = false;
      }
    }

    function pause() {
      paused = true;
      disconnect();
    }

    function resume() {
      paused = false;
      attempt = 0;
      void connect();
    }

    const onVisibility = () => (document.hidden ? pause() : resume());
    const onOnline = () => {
      attempt = 0;
      disconnect();
      if (!paused) void connect();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);

    // Native app state is more reliable than visibilitychange in some webviews.
    let removeAppListener: (() => void) | undefined;
    if (isNative) {
      void import('@capacitor/app').then(async ({ App }) => {
        const handle = await App.addListener('appStateChange', ({ isActive }) => (isActive ? resume() : pause()));
        if (stopped) void handle.remove();
        else removeAppListener = () => void handle.remove();
      });
    }

    void connect();

    return () => {
      stopped = true;
      disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
      removeAppListener?.();
    };
  }, [tripId]);
}
