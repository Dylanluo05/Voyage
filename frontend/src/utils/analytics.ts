/**
 * Plausible analytics: cookie-free, no personal data, no consent banner needed.
 * Fully opt-in via VITE_PLAUSIBLE_DOMAIN; unset, every call here is a no-op.
 * Never pass emails, names, or trip content as event properties.
 */
type EventName = 'Signup' | 'Google Auth' | 'Trip Created' | 'Checkout Started';

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string | number | boolean> }) => void;
  }
}

export function initAnalytics(): void {
  const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
  if (!domain) return;
  // Plausible's script hooks history.pushState, so SPA route changes are tracked automatically.
  const script = document.createElement('script');
  script.defer = true;
  script.dataset.domain = domain;
  script.src = 'https://plausible.io/js/script.js';
  document.head.appendChild(script);
  window.plausible =
    window.plausible ||
    function (...args: unknown[]) {
      ((window.plausible as unknown as { q?: unknown[] }).q = (window.plausible as unknown as { q?: unknown[] }).q || []).push(args);
    } as Window['plausible'];
}

export function track(event: EventName, props?: Record<string, string | number | boolean>): void {
  try {
    window.plausible?.(event, props ? { props } : undefined);
  } catch {
    /* analytics must never break the app */
  }
}
