import { useEffect, useState } from 'react';
import type { Report, ReportStatus } from '../types';
import { listReports, updateReportStatus, removeReportedContent } from '../api/reports';
import { ApiError } from '../api/client';
import { Icon } from '../components/Icon';

const TARGET_LABEL: Record<Report['targetType'], string> = {
  trip: 'Trip',
  sidequest: 'Sidequest',
  sidequestCompletion: 'Completion photo',
  sidequestComment: 'Comment',
};

export default function AdminReportsPage() {
  const [status, setStatus] = useState<ReportStatus>('pending');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  function load(s: ReportStatus) {
    setLoading(true);
    setError('');
    listReports(s)
      .then(setReports)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load reports'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(status); }, [status]);

  async function dismiss(id: string) {
    setBusyId(id);
    try {
      await updateReportStatus(id, 'dismissed');
      setReports((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to dismiss report');
    } finally {
      setBusyId(null);
    }
  }

  async function removeContent(id: string) {
    if (!confirm('Permanently remove this content? This cannot be undone.')) return;
    setBusyId(id);
    try {
      await removeReportedContent(id);
      setReports((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove content');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="wrap" style={{ paddingBlock: '2.5rem 4rem' }}>
      <span className="eyebrow">Admin</span>
      <h1>Reported content</h1>

      <div className="admin-report-tabs">
        {(['pending', 'resolved', 'dismissed'] as ReportStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            className={`admin-report-tab${status === s ? ' is-on' : ''}`}
            onClick={() => setStatus(s)}
          >
            {s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading…</p>}

      {!loading && reports.length === 0 && !error && <p className="muted">No {status} reports.</p>}

      <ul className="admin-report-list">
        {reports.map((r) => (
          <li key={r._id} className="admin-report-card">
            <div className="admin-report-head">
              <span className="admin-report-type">{TARGET_LABEL[r.targetType]}</span>
              <time>{new Date(r.createdAt).toLocaleString()}</time>
            </div>

            {r.preview.exists ? (
              <div className="admin-report-preview">
                {r.preview.imageUrl && <img src={r.preview.imageUrl} alt="" />}
                <p>{r.preview.summary}</p>
              </div>
            ) : (
              <p className="muted">This content no longer exists.</p>
            )}

            <p className="admin-report-reason">
              <Icon name="warning" size={15} /> Reported by <b>{r.reporterName}</b>: {r.reason}
            </p>

            {status === 'pending' && (
              <div className="admin-report-actions">
                <button type="button" className="admin-report-btn admin-report-btn--ghost" disabled={busyId === r._id} onClick={() => dismiss(r._id)}>
                  Dismiss
                </button>
                {r.preview.exists && (
                  <button type="button" className="admin-report-btn admin-report-btn--danger" disabled={busyId === r._id} onClick={() => removeContent(r._id)}>
                    Remove content
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
