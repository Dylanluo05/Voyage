import { Capacitor } from '@capacitor/core';

/** True when running inside the Capacitor iOS/Android shell (false in a normal browser). */
export const isNative = Capacitor.isNativePlatform();

/** 'ios' | 'android' | 'web' */
export const platform = Capacitor.getPlatform();

/**
 * One-time native setup: tags <html> so CSS can target the app shell,
 * styles the status bar, hides the splash screen, and wires the Android back button.
 * No-op on the web.
 */
export async function initNative(): Promise<void> {
  if (!isNative) return;

  document.documentElement.classList.add('is-native', `is-${platform}`);

  const [{ StatusBar, Style }, { SplashScreen }, { App }] = await Promise.all([
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen'),
    import('@capacitor/app'),
  ]);

  try {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    if (platform === 'android') await StatusBar.setOverlaysWebView({ overlay: true });
  } catch {
    /* status bar plugin unavailable — non-fatal */
  }

  // Android hardware back: navigate history, exit only from the root.
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack && window.history.length > 1) window.history.back();
    else App.exitApp();
  });

  await SplashScreen.hide().catch(() => undefined);
}

/**
 * Open an external page (Stripe, Spotify). In the app this is the system in-app browser
 * (SFSafariViewController / Chrome Custom Tabs), which the user can dismiss to come back;
 * on the web it's a normal redirect.
 */
export async function openExternal(url: string): Promise<void> {
  if (!isNative) {
    window.location.href = url;
    return;
  }
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url });
}

/** Close the in-app browser if it's open (no-op on the web and on Android, where it can't be closed from JS). */
export async function closeExternal(): Promise<void> {
  if (!isNative) return;
  const { Browser } = await import('@capacitor/browser');
  await Browser.close().catch(() => undefined);
}

/**
 * App Store and Play Store rules generally require their own billing for digital subscriptions, so
 * buying a plan is web-only by default. Set VITE_ENABLE_NATIVE_PURCHASES=true to allow Stripe
 * checkout inside the app (for testing, or where external-purchase links are permitted).
 */
export const canPurchaseHere = !isNative || import.meta.env.VITE_ENABLE_NATIVE_PURCHASES === 'true';
