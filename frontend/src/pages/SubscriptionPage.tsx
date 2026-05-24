import { useEffect, useState } from 'react';
import { getBillingStatus, startCheckout, openPortal, BillingStatus, Plan } from '../api/billing';

const TIER_ORDER: Plan[] = ['free', 'explorer', 'pro', 'globetrotter'];

const TIER_FEATURES: Record<Plan, string[]> = {
  free:         ['3 trips', '5 AI requests / day', 'AI trip chat', 'All core planning features'],
  explorer:     ['15 trips', '30 AI requests / day', 'AI trip chat', 'All core planning features'],
  pro:          ['Unlimited trips', '100 AI requests / day', 'AI trip chat', 'All core planning features'],
  globetrotter: ['Unlimited trips', '500 AI requests / day', 'AI trip chat', 'All core planning features', 'Priority support'],
};

const TIER_ACCENT: Record<Plan, string> = {
  free:         'var(--muted)',
  explorer:     '#60a5fa',
  pro:          'var(--teal)',
  globetrotter: 'var(--gold)',
};

const TIER_BADGE: Record<Plan, string | null> = {
  free:         null,
  explorer:     null,
  pro:          'Most Popular',
  globetrotter: null,
};

export default function SubscriptionPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<Plan | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState('');

  const searchParams = new URLSearchParams(window.location.search);
  const justUpgraded = searchParams.get('success') === '1';

  useEffect(() => {
    getBillingStatus()
      .then(setStatus)
      .catch(() => setError('Failed to load subscription info.'))
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async (tier: Plan) => {
    if (tier === 'free') return;
    setCheckoutLoading(tier);
    setError('');
    try {
      await startCheckout(tier as Exclude<Plan, 'free'>);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    setError('');
    try {
      await openPortal();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setPortalLoading(false);
    }
  };

  const currentPlan = status?.plan ?? 'free';
  const tierConfig = status?.tierConfig;

  return (
    <div className="sub-page">
      <div className="sub-header">
        <h1>Plans & Pricing</h1>
        <p className="sub-tagline">Choose the plan that fits your travel style.</p>
        {justUpgraded && (
          <div className="sub-success-banner">
            You're all set! Your plan has been upgraded.
          </div>
        )}
        {error && <div className="error" style={{ maxWidth: 480, margin: '0 auto' }}>{error}</div>}
      </div>

      {loading ? (
        <p className="muted" style={{ textAlign: 'center' }}>Loading…</p>
      ) : (
        <>
          <div className="sub-grid">
            {TIER_ORDER.map((tier) => {
              const config = tierConfig?.[tier];
              const isCurrent = tier === currentPlan;
              const isDowngrade = TIER_ORDER.indexOf(tier) < TIER_ORDER.indexOf(currentPlan);
              const badge = TIER_BADGE[tier];
              const accent = TIER_ACCENT[tier];
              const price = config?.price ?? 0;

              return (
                <div
                  key={tier}
                  className={`sub-card${isCurrent ? ' sub-card--current' : ''}${tier === 'pro' ? ' sub-card--featured' : ''}`}
                  style={{ '--tier-accent': accent } as React.CSSProperties}
                >
                  {badge && <div className="sub-badge">{badge}</div>}
                  <div className="sub-card-header">
                    <span className="sub-tier-name">{config?.label ?? tier}</span>
                    <div className="sub-price">
                      {price === 0 ? (
                        <span className="sub-price-amount">Free</span>
                      ) : (
                        <>
                          <span className="sub-price-amount">${price}</span>
                          <span className="sub-price-period">/mo</span>
                        </>
                      )}
                    </div>
                  </div>

                  <ul className="sub-features">
                    {TIER_FEATURES[tier].map((f) => (
                      <li key={f} className="sub-feature">
                        <span className="sub-check">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="sub-card-footer">
                    {isCurrent ? (
                      <div className="sub-current-label">Current plan</div>
                    ) : isDowngrade ? (
                      <div className="sub-downgrade-note">
                        {status?.hasSubscription
                          ? 'Manage via billing portal'
                          : 'Your current plan'}
                      </div>
                    ) : (
                      <button
                        className="sub-cta-btn"
                        style={{ background: accent, color: tier === 'explorer' ? '#08090e' : tier === 'pro' ? '#08090e' : '#08090e' }}
                        disabled={checkoutLoading !== null}
                        onClick={() => handleUpgrade(tier)}
                      >
                        {checkoutLoading === tier ? 'Redirecting…' : `Upgrade to ${config?.label ?? tier}`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {status?.hasSubscription && (
            <div className="sub-manage-row">
              <button
                className="ghost"
                disabled={portalLoading}
                onClick={handlePortal}
              >
                {portalLoading ? 'Loading…' : 'Manage billing & cancel subscription'}
              </button>
              <p className="muted small">You'll be redirected to Stripe's secure billing portal.</p>
            </div>
          )}

          {status && (
            <div className="sub-usage-row">
              <span className="muted small">
                Today: {status.used} / {status.aiRequestsPerDay === -1 ? '∞' : status.aiRequestsPerDay} AI requests used
                {status.maxTrips !== -1 && ` · Trip limit: ${status.maxTrips}`}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
