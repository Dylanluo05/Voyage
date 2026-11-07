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
