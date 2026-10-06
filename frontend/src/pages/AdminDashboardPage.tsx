import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AdminAnalytics } from '../types';
import { getAnalytics } from '../api/admin';
import { ApiError } from '../api/client';
import { Icon } from '../components/Icon';

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

  const { growth, revenue, health } = data;
  const maxSignups = Math.max(1, ...growth.signupSeries.map((d) => d.count));
  const planOrder: (keyof typeof revenue.planCounts)[] = ['free', 'explorer', 'pro', 'globetrotter'];
  const maxPlanCount = Math.max(1, ...planOrder.map((p) => revenue.planCounts[p]));

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

      <p className="admin-dashboard-link">
        <Link to="/admin/reports">
          <Icon name="warning" size={15} /> Go to the reports queue
        </Link>
      </p>
    </div>
  );
}
