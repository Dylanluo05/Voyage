import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AdminAnalytics } from '../types';
import { getAnalytics } from '../api/admin';
import { ApiError } from '../api/client';
import { Icon } from '../components/Icon';

const FEATURE_LABEL: Record<string, string> = {
  chat: 'Trip chat assistant',
  vibe: 'Playlist vibe suggestions',
  import: 'Booking text import',
  sidequest: 'Sidequest photo verification',
};

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="admin-stat-card">
      <span className="admin-stat-label">{label}</span>
      <span className="admin-stat-value">{value}</span>
      {hint && <span className="admin-stat-hint">{hint}</span>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getAnalytics()
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load analytics'));
  }, []);

  if (error) {
    return (
      <div className="wrap" style={{ paddingBlock: '2.5rem 4rem' }}>
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="wrap" style={{ paddingBlock: '2.5rem 4rem' }}>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  const { growth, revenue, health, aiCost } = data;
  const maxSignups = Math.max(1, ...growth.signupSeries.map((d) => d.count));
  const planOrder: (keyof typeof revenue.planCounts)[] = ['free', 'explorer', 'pro', 'globetrotter'];
  const maxPlanCount = Math.max(1, ...planOrder.map((p) => revenue.planCounts[p]));
  const maxDailyCost = Math.max(0.01, ...aiCost.dailySeries.map((d) => d.costUsd));
  const maxModelCost = Math.max(0.01, ...aiCost.byModel.map((m) => m.costUsd));

  return (
    <div className="wrap" style={{ paddingBlock: '2.5rem 4rem' }}>
      <span className="eyebrow">Admin</span>
      <h1>Dashboard</h1>
      <p className="muted" style={{ marginBottom: '2rem' }}>
        <Link to="/admin/reports">View the reports queue</Link>
        {health.pendingReports > 0 && ` — ${health.pendingReports} pending`}
      </p>

      <h2 className="admin-section-title">Growth &amp; engagement</h2>
      <div className="admin-stat-grid">
        <StatCard label="Total users" value={growth.totalUsers} hint={`+${growth.newUsers7d} in 7d / +${growth.newUsers30d} in 30d`} />
        <StatCard label="Total trips" value={growth.totalTrips} hint={`+${growth.newTrips7d} in 7d`} />
        <StatCard label="Sidequest claims" value={growth.totalSidequestClaims} />
        <StatCard label="Sidequest completions" value={growth.totalSidequestCompletions} />
      </div>

      <div className="admin-chart">
        <h3>Signups, last 30 days</h3>
        <div className="admin-bar-row">
          {growth.signupSeries.map((d) => (
            <div key={d.date} className="admin-bar" title={`${d.date}: ${d.count}`}>
              <span className="admin-bar-fill" style={{ height: `${(d.count / maxSignups) * 100}%` }} />
            </div>
          ))}
          {growth.signupSeries.length === 0 && <p className="muted">No signups in this window.</p>}
        </div>
      </div>

      <h2 className="admin-section-title">Revenue &amp; billing</h2>
      <div className="admin-stat-grid">
        <StatCard label="Estimated MRR" value={`$${revenue.estimatedMRR.toFixed(2)}`} hint="Based on configured tier pricing" />
        <StatCard label="Paying users" value={planOrder.filter((p) => p !== 'free').reduce((sum, p) => sum + revenue.planCounts[p], 0)} />
      </div>
      <div className="admin-plan-bars">
        {planOrder.map((plan) => (
          <div key={plan} className="admin-plan-row">
            <span className="admin-plan-label">{revenue.tierConfig[plan].label}</span>
            <div className="admin-plan-track">
              <span className="admin-plan-fill" style={{ width: `${(revenue.planCounts[plan] / maxPlanCount) * 100}%` }} />
            </div>
            <span className="admin-plan-count">{revenue.planCounts[plan]}</span>
          </div>
        ))}
      </div>

      <h2 className="admin-section-title">System health</h2>
      <div className="admin-stat-grid">
        <StatCard label="Pending reports" value={health.pendingReports} hint={health.pendingReports > 0 ? 'Needs review' : 'All clear'} />
        <StatCard label="AI requests today" value={health.aiRequestsToday} />
      </div>

      <h2 className="admin-section-title">API costs</h2>
      <p className="muted" style={{ marginBottom: '1rem', fontSize: '0.88rem' }}>
        Claude/Anthropic costs are tracked below (accurate, computed from actual token usage since this
        tracking was added — no historical backfill). Google Maps and Cloudinary usage run entirely
        client-side and aren't visible to our backend; check those in Google Cloud Console and the
        Cloudinary dashboard directly.
      </p>
      <div className="admin-stat-grid">
        <StatCard label="Total Claude spend" value={`$${aiCost.totalCostUsd.toFixed(4)}`} hint="Since cost tracking was added" />
        {aiCost.byFeature.map((f) => (
          <StatCard key={f.feature} label={FEATURE_LABEL[f.feature] ?? f.feature} value={`$${f.costUsd.toFixed(4)}`} />
        ))}
      </div>

      {aiCost.byModel.length > 0 && (
        <div className="admin-plan-bars" style={{ marginTop: '1.25rem' }}>
          {aiCost.byModel.map((m) => (
            <div key={m.model} className="admin-plan-row">
              <span className="admin-plan-label">{m.model}</span>
              <div className="admin-plan-track">
                <span className="admin-plan-fill" style={{ width: `${(m.costUsd / maxModelCost) * 100}%` }} />
              </div>
              <span className="admin-plan-count">${m.costUsd.toFixed(4)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="admin-chart">
        <h3>Claude spend, last 30 days</h3>
        <div className="admin-bar-row">
          {aiCost.dailySeries.map((d) => (
            <div key={d.date} className="admin-bar" title={`${d.date}: $${d.costUsd.toFixed(4)}`}>
              <span className="admin-bar-fill" style={{ height: `${(d.costUsd / maxDailyCost) * 100}%` }} />
            </div>
          ))}
          {aiCost.dailySeries.length === 0 && <p className="muted">No AI usage in this window.</p>}
        </div>
      </div>

      <p className="admin-dashboard-link">
        <Link to="/admin/reports">
          <Icon name="warning" size={15} /> Go to the reports queue
        </Link>
      </p>
    </div>
  );
}
