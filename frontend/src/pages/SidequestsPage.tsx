import { useState, useEffect } from 'react';
import { PublicSidequest, Trip } from '../types';
import * as tripsApi from '../api/trips';
import * as sidequestsApi from '../api/publicSidequests';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

type Difficulty = 'all' | 'easy' | 'medium' | 'hard' | 'legendary';

const DIFFICULTY_LABEL: Record<string, string> = {
    easy: '🟢 Easy',
    medium: '🟡 Medium',
    hard: '🟠 Hard',
    legendary: '⚡ Legendary',
};

const DIFFICULTY_TABS: { key: Difficulty; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'easy', label: '🟢 Easy' },
    { key: 'medium', label: '🟡 Medium' },
    { key: 'hard', label: '🟠 Hard' },
    { key: 'legendary', label: '⚡ Legendary' },
];

export default function SidequestsPage() {
    const { user } = useAuth();
    const [sidequests, setSidequests] = useState<PublicSidequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [locationQuery, setLocationQuery] = useState('');
    const [activeTab, setActiveTab] = useState<Difficulty>('all');
    const [claimingId, setClaimingId] = useState<string | null>(null);
    const [completingId, setCompletingId] = useState<string | null>(null);
    const [photoUrl, setPhotoUrl] = useState('');
    const [addingToTripId, setAddingToTripId] = useState<string | null>(null);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [selectedTripId, setSelectedTripId] = useState('');

    useEffect(() => {
        const fetchAll = async () => {
            try {
                setLoading(true);
                const [sq, tr] = await Promise.all([
                    sidequestsApi.listPublicSidequests(),
                    tripsApi.listTrips(),
                ]);
                setSidequests(sq);
                setTrips(tr);
                if (tr.length > 0) setSelectedTripId(tr[0]._id);
            } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Failed to load sidequests');
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    async function onSearch() {
        try {
            setLoading(true);
            setSidequests(await sidequestsApi.listPublicSidequests(locationQuery));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : `Failed to search`);
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
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to add to trip');
        }
    }

    const filtered = activeTab === 'all'
        ? sidequests
        : sidequests.filter(s => s.difficulty === activeTab);

    const counts: Record<Difficulty, number> = {
        all: sidequests.length,
        easy: sidequests.filter(s => s.difficulty === 'easy').length,
        medium: sidequests.filter(s => s.difficulty === 'medium').length,
        hard: sidequests.filter(s => s.difficulty === 'hard').length,
        legendary: sidequests.filter(s => s.difficulty === 'legendary').length,
    };

    return (
        <div className="page">

            {/* Page Hero */}
            <div className="sq-page-hero">
                <h1>Public Sidequests</h1>
                <p>Community travel challenges. Complete them. Earn XP. Build your legend.</p>
                <div className="sq-page-stats">
                    <span className="sq-page-stat-pill">🟢 {counts.easy} Easy</span>
                    <span className="sq-page-stat-pill">🟡 {counts.medium} Medium</span>
                    <span className="sq-page-stat-pill">🟠 {counts.hard} Hard</span>
                    <span className="sq-page-stat-pill">⚡ {counts.legendary} Legendary</span>
                </div>
            </div>

            {/* Search */}
            <section className="card" style={{ marginBottom: 0 }}>
                <div className="search-row">
                    <input
                        type="text"
                        value={locationQuery}
                        onChange={e => setLocationQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && onSearch()}
                        placeholder="Filter by location…"
                    />
                    <button type="button" onClick={onSearch}>Search</button>
                </div>
            </section>

            {/* Difficulty filter tabs */}
            <div className="sq-filter-row" style={{ marginTop: '16px' }}>
                {DIFFICULTY_TABS.map(tab => (
                    <button
                        key={tab.key}
                        type="button"
                        className={`sq-filter-tab sq-filter-tab--${tab.key}${activeTab === tab.key ? ' active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.label} {counts[tab.key] > 0 && <span style={{ opacity: 0.65, marginLeft: 4 }}>{counts[tab.key]}</span>}
                    </button>
                ))}
            </div>

            {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}
            {loading && <p className="muted" style={{ marginTop: 12 }}>Loading…</p>}
            {!loading && filtered.length === 0 && (
                <p className="muted" style={{ marginTop: 16 }}>No sidequests found.</p>
            )}

            {/* Grid */}
            {filtered.length > 0 && (
                <ul className="sq-grid" style={{ marginTop: 20, listStyle: 'none', padding: 0 }}>
                    {filtered.map(s => {
                        const isClaimed = s.claims.some(c => c.userId === user?.id);
                        const isCompleted = s.completions.some(c => c.userId === user?.id);

                        return (
                            <li key={s._id} className={`card claims-card claims-card--${s.difficulty}`} style={{ marginBottom: 0 }}>
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
                                    <p className="muted small" style={{ margin: '6px 0 0', lineHeight: 1.55 }}>
                                        {s.description}
                                    </p>
                                )}

                                <div className="claims-card-footer-meta">
                                    {s.location && <span className="muted small">📍 {s.location}</span>}
                                    <span className="muted small">By {s.createdBy.userName}</span>
                                </div>

                                {s.completions.length > 0 && (
                                    <div className="sidequest-completion-thumbs">
                                        {s.completions.slice(0, 6).map(c => (
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
                                        <span className="completed-badge">✓ Completed</span>
                                    ) : isClaimed ? (
                                        <button
                                            type="button"
                                            onClick={() => { setCompletingId(s._id); setPhotoUrl(''); }}
                                        >
                                            Submit Proof
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="ghost"
                                            disabled={claimingId === s._id}
                                            onClick={() => onClaim(s._id)}
                                        >
                                            {claimingId === s._id ? 'Claiming…' : '⚑ Claim'}
                                        </button>
                                    )}
                                    {trips.length > 0 && (
                                        <button
                                            type="button"
                                            className="ghost small-btn"
                                            onClick={() => setAddingToTripId(s._id)}
                                        >
                                            + Add to Trip
                                        </button>
                                    )}
                                </div>

                                {completingId === s._id && (
                                    <div className="claims-complete-form">
                                        <input
                                            type="text"
                                            value={photoUrl}
                                            onChange={e => setPhotoUrl(e.target.value)}
                                            placeholder="Paste a public photo URL as proof…"
                                            autoFocus
                                        />
                                        {photoUrl && (
                                            <img src={photoUrl} className="claims-proof-preview" alt="Preview" onError={e => (e.currentTarget.style.display = 'none')} />
                                        )}
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
                                        <select value={selectedTripId} onChange={e => setSelectedTripId(e.target.value)}>
                                            {trips.map(t => (
                                                <option key={t._id} value={t._id}>{t.title}</option>
                                            ))}
                                        </select>
                                        <div className="search-row">
                                            <button type="button" onClick={() => onAddToTrip(s._id)}>Add to Trip</button>
                                            <button type="button" className="ghost" onClick={() => setAddingToTripId(null)}>Cancel</button>
                                        </div>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
