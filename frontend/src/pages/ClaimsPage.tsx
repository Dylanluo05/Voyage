import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PublicSidequest } from '../types';
import * as sidequestsApi from '../api/publicSidequests';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  legendary: 'Legendary ⚡',
};

export default function ClaimsPage() {
  const { user } = useAuth();
  const [sidequests, setSidequests] = useState<PublicSidequest[]>([]);
  const [visibleSidequests, setVisibleSidequests] = useState<PublicSidequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchClaimed = async () => {
      try {
        setLoading(true);
        const data = await sidequestsApi.listClaimedSidequests();
        setSidequests(data);
        setVisibleSidequests(data);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load claimed sidequests');
      } finally {
        setLoading(false);
      }
    };
    fetchClaimed();
  }, []);

  const onSearch = () => {
    const q = searchQuery.toLowerCase();
    setVisibleSidequests(
      q
        ? sidequests.filter(s =>
            s.title.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)
          )
        : sidequests
    );
  };

  const onComplete = async (id: string) => {
    setSubmitting(true);
    setError('');
    try {
      const updated = await sidequestsApi.completePublicSidequest(id, photoUrl);
      setSidequests(prev => prev.map(s => (s._id === id ? updated : s)));
      setVisibleSidequests(prev => prev.map(s => (s._id === id ? updated : s)));
      setCompletingId(null);
      setPhotoUrl('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to complete sidequest');
    } finally {
      setSubmitting(false);
    }
  };

  const completedCount = sidequests.filter(s => s.completions.some(c => c.userId === user?.id)).length;
  const totalXp = sidequests
    .filter(s => s.completions.some(c => c.userId === user?.id))
    .reduce((sum, s) => sum + s.xpReward, 0);

  return (
    <div className="page">
      <h1>My Claims</h1>

      {sidequests.length > 0 && (
        <div className="claims-stats-row">
          <div className="claims-stat">
            <span className="claims-stat-value">{sidequests.length}</span>
            <span className="claims-stat-label">Claimed</span>
          </div>
          <div className="claims-stat">
            <span className="claims-stat-value">{completedCount}</span>
            <span className="claims-stat-label">Completed</span>
          </div>
          <div className="claims-stat">
            <span className="claims-stat-value claims-stat-xp">+{totalXp}</span>
            <span className="claims-stat-label">XP Earned</span>
          </div>
        </div>
      )}

      <section className="card">
        <div className="search-row">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSearch()}
            placeholder="Search your claims…"
          />
          <button type="button" onClick={onSearch}>Search</button>
        </div>
      </section>

      <section className="list-section">
        {loading && <p className="muted">Loading…</p>}
        {error && <p className="error">{error}</p>}

        {!loading && sidequests.length === 0 && (
          <p className="muted">
            You haven't claimed any sidequests yet.{' '}
            <Link to="/sidequests">Browse sidequests</Link> to get started.
          </p>
        )}

        {!loading && sidequests.length > 0 && visibleSidequests.length === 0 && searchQuery && (
          <p className="muted">No sidequests matched your search.</p>
        )}

        {visibleSidequests.length > 0 && (
          <ul className="sidequest-list">
            {visibleSidequests.map(s => {
              const isCompleted = s.completions.some(c => c.userId === user?.id);
              const myCompletion = s.completions.find(c => c.userId === user?.id);

              return (
                <li key={s._id} className={`card claims-card claims-card--${s.difficulty}`}>
                  <div className="claims-card-header">
                    <div className="claims-card-meta">
                      <span className={`difficulty-badge difficulty-badge--${s.difficulty}`}>
                        {DIFFICULTY_LABEL[s.difficulty]}
                      </span>
                      <span className="xp-badge">+{s.xpReward} XP</span>
                    </div>
                    {isCompleted && <span className="completed-badge">Completed ✓</span>}
                  </div>

                  <h3 className="claims-card-title">{s.title}</h3>
                  {s.description && <p className="muted small" style={{ marginTop: '4px' }}>{s.description}</p>}

                  <div className="claims-card-footer-meta">
                    {s.location && <span className="muted small">📍 {s.location}</span>}
                    <span className="muted small">By {s.createdBy.userName}</span>
                  </div>

                  {isCompleted && myCompletion && (
                    <div className="claims-proof">
                      <img src={myCompletion.photoUrl} alt="Completion proof" className="claims-proof-img" />
                    </div>
                  )}

                  {!isCompleted && completingId !== s._id && (
                    <div className="sidequest-card-actions">
                      <button
                        type="button"
                        className="ghost small-btn"
                        onClick={() => { setCompletingId(s._id); setPhotoUrl(''); setError(''); }}
                      >
                        Submit Proof
                      </button>
                    </div>
                  )}

                  {!isCompleted && completingId === s._id && (
                    <div className="claims-complete-form">
                      <input
                        type="text"
                        placeholder="Paste a photo URL as proof…"
                        value={photoUrl}
                        onChange={e => setPhotoUrl(e.target.value)}
                        autoFocus
                      />
                      {photoUrl && (
                        <img src={photoUrl} alt="Proof preview" className="claims-proof-preview" />
                      )}
                      <div className="search-row">
                        <button
                          type="button"
                          disabled={!photoUrl || submitting}
                          onClick={() => onComplete(s._id)}
                        >
                          {submitting ? 'Submitting…' : 'Complete'}
                        </button>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => { setCompletingId(null); setPhotoUrl(''); }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
