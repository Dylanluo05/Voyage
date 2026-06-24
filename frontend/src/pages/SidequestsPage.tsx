import { useState, useEffect } from 'react';
import { PublicSidequest, Trip } from '../types';
import * as tripsApi from '../api/trips';
import * as sidequestsApi from '../api/publicSidequests';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

const DIFFICULTY_LABEL: Record<string, string> = {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    legendary: 'Legendary ⚡',
};

export default function SidequestsPage() {
    const { user } = useAuth();
    const [sidequests, setSidequests] = useState<PublicSidequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [locationQuery, setLocationQuery] = useState('');
    const [claimingId, setClaimingId] = useState<string | null>(null);
    const [completingId, setCompletingId] = useState<string | null>(null);
    const [photoUrl, setPhotoUrl] = useState('');
    const [addingToTripId, setAddingToTripId] = useState<string | null>(null);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [selectedTripId, setSelectedTripId] = useState('');

    useEffect(() => {
        const fetchPublicSidequests = async () => {
            try {
                setLoading(true);
                setSidequests(await sidequestsApi.listPublicSidequests());
                setTrips(await tripsApi.listTrips());
            } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Failed to load public sidequests');
            } finally {
                setLoading(false);
            }
        };
        fetchPublicSidequests();
    }, []);

    useEffect(() => {
        if (trips.length > 0 && !selectedTripId) {
            setSelectedTripId(trips[0]._id);
        }
    }, [trips]);

    async function onSearch() {
        try {
            setLoading(true);
            setSidequests(await sidequestsApi.listPublicSidequests(locationQuery));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : `Failed to load sidequests for: ${locationQuery}`);
        } finally {
            setLoading(false);
        }
    }

    async function onClaim(id: string) {
        setClaimingId(id);
        setError('');
        try {
            const updated = await sidequestsApi.claimPublicSidequest(id);
            setSidequests(prev => prev.map(s => s._id === id ? updated : s));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to claim sidequest');
        } finally {
            setClaimingId(null);
        }
    }

    async function onComplete(id: string) {
        try {
            const updated = await sidequestsApi.completePublicSidequest(id, photoUrl);
            setSidequests(prev => prev.map(s => s._id === id ? updated : s));
            setCompletingId(null);
            setPhotoUrl('');
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to complete sidequest');
        }
    }

    async function onAddToTrip(id: string) {
        try {
            await sidequestsApi.addToTrip(id, selectedTripId);
            setAddingToTripId(null);
            setSelectedTripId(trips[0]._id);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to add sidequest to trip');
        }
    }

    return (
        <div className="page">
            <h1>Public Sidequests</h1>

            <section className="card">
                <div className="search-row">
                    <input
                        type="text"
                        value={locationQuery}
                        onChange={(e) => setLocationQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                        placeholder="Filter by location…"
                    />
                    <button type="button" onClick={onSearch}>Search</button>
                </div>
            </section>

            <section className="list-section">
                {loading && <p className="muted">Loading…</p>}
                {error && <p className="error">{error}</p>}
                {!loading && sidequests.length === 0 && (
                    <p className="muted">No sidequests available at this time.</p>
                )}

                {sidequests.length > 0 && (
                    <ul className="sidequest-list">
                        {sidequests.map(s => {
                            const isClaimed = s.claims.some(c => c.userId === user?.id);
                            const isCompleted = s.completions.some(c => c.userId === user?.id);

                            return (
                                <li key={s._id} className={`card claims-card claims-card--${s.difficulty}`}>
                                    <div className="claims-card-header">
                                        <div className="claims-card-meta">
                                            <span className={`difficulty-badge difficulty-badge--${s.difficulty}`}>
                                                {DIFFICULTY_LABEL[s.difficulty] ?? s.difficulty}
                                            </span>
                                            {s.xpReward != null && (
                                                <span className="xp-badge">+{s.xpReward} XP</span>
                                            )}
                                        </div>
                                        <span className="muted small">
                                            {s.completions.length} completion{s.completions.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>

                                    <h3 className="claims-card-title">{s.title}</h3>
                                    {s.description && (
                                        <p className="muted small" style={{ margin: '4px 0 0' }}>{s.description}</p>
                                    )}

                                    <div className="claims-card-footer-meta">
                                        {s.location && <span className="muted small">📍 {s.location}</span>}
                                        <span className="muted small">By {s.createdBy.userName}</span>
                                    </div>

                                    {s.completions.length > 0 && (
                                        <div className="sidequest-completion-thumbs">
                                            {s.completions.map(c => (
                                                <img
                                                    key={c.userId}
                                                    src={c.photoUrl}
                                                    className="sidequest-completion-thumb"
                                                    alt="Completion proof"
                                                />
                                            ))}
                                        </div>
                                    )}

                                    <div className="sidequest-card-actions">
                                        {isCompleted ? (
                                            <span className="completed-badge">Completed ✓</span>
                                        ) : isClaimed ? (
                                            <button
                                                type="button"
                                                className="ghost small-btn"
                                                onClick={() => { setCompletingId(s._id); setPhotoUrl(''); }}
                                            >
                                                Submit Proof
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className="ghost small-btn"
                                                disabled={claimingId === s._id}
                                                onClick={() => onClaim(s._id)}
                                            >
                                                {claimingId === s._id ? 'Claiming…' : 'Claim'}
                                            </button>
                                        )}
                                        {trips.length > 0 && (
                                            <button
                                                type="button"
                                                className="ghost small-btn"
                                                onClick={() => setAddingToTripId(s._id)}
                                            >
                                                Add to Trip
                                            </button>
                                        )}
                                    </div>

                                    {completingId === s._id && (
                                        <div className="claims-complete-form">
                                            <input
                                                type="text"
                                                value={photoUrl}
                                                onChange={(e) => setPhotoUrl(e.target.value)}
                                                placeholder="Paste a photo URL as proof…"
                                                autoFocus
                                            />
                                            <div className="search-row">
                                                <button type="button" disabled={!photoUrl} onClick={() => onComplete(s._id)}>
                                                    Confirm
                                                </button>
                                                <button type="button" className="ghost" onClick={() => { setCompletingId(null); setPhotoUrl(''); }}>
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {addingToTripId === s._id && (
                                        <div className="claims-complete-form">
                                            <select
                                                value={selectedTripId}
                                                onChange={(e) => setSelectedTripId(e.target.value)}
                                            >
                                                {trips.map(t => (
                                                    <option key={t._id} value={t._id}>{t.title}</option>
                                                ))}
                                            </select>
                                            <div className="search-row">
                                                <button type="button" onClick={() => onAddToTrip(s._id)}>
                                                    Add to Trip
                                                </button>
                                                <button type="button" className="ghost" onClick={() => setAddingToTripId(null)}>
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
