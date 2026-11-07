import { env } from '../config/env';

/**
 * The web app's origin for browser redirects: the first CLIENT_ORIGIN entry that isn't one of the
 * native app's own origins (capacitor://localhost, http://localhost), so listing those in any
 * order can't send web users to the wrong place.
 */
function webOrigin(): string {
  const isAppOrigin = (o: string) => o.startsWith('capacitor://') || o === 'http://localhost' || o === 'https://localhost';
  return env.clientOrigins.find((o) => !isAppOrigin(o)) ?? env.clientOrigin;
}

/** Custom URL scheme registered by the Capacitor app (iOS Info.plist / Android manifest). */
const APP_SCHEME = 'voyage';

/** Deep link into the native app. The in-app path is carried in a query param so it survives URL parsing. */
export function appLink(path: string): string {
  return `${APP_SCHEME}://open?path=${encodeURIComponent(path)}`;
}

/**
 * Where to send the user after an external flow (Spotify, Stripe): straight into the app for
 * native clients, or back to the web app otherwise. `path` is an in-app path like `/trips/123?x=1`.
 */
export function returnUrl(native: boolean, path: string): string {
  return native ? appLink(path) : `${webOrigin()}${path}`;
}

/**
 * Like returnUrl, but for places that insist on an https URL (Stripe's success/cancel URLs).
 * Native clients go through the web app's /app-return page, which hands off to the app.
 */
export function httpsReturnUrl(native: boolean, path: string): string {
  return native
    ? `${webOrigin()}/app-return?to=${encodeURIComponent(path)}`
    : `${webOrigin()}${path}`;
}
