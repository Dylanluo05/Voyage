import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

/**
 * Landing page for Stripe's success/cancel URLs when checkout was started from the native app.
 * Stripe needs an https return URL, so this page hands the user back to the app via the
 * `voyage://` link. In a regular browser (no app installed) it offers to continue on the web.
 */
export default function AppReturnPage() {
  const [params] = useSearchParams();
  const to = params.get('to') ?? '/';
  const safeTo = /^\/(?![/\\])/.test(to) ? to : '/';
  const appUrl = `voyage://open?path=${encodeURIComponent(safeTo)}`;

  useEffect(() => {
    window.location.href = appUrl;
  }, [appUrl]);

  return (
    <main style={{ textAlign: 'center', padding: '4rem 1.25rem' }}>
      <h1>Returning to Voyage…</h1>
      <p className="muted">If the app doesn’t open on its own, tap the button below.</p>
      <p>
        <a className="btn" href={appUrl}>Open Voyage</a>
      </p>
      <p className="muted small">
        Not on your phone? <Link to={safeTo}>Continue on the web</Link>
      </p>
    </main>
  );
}
