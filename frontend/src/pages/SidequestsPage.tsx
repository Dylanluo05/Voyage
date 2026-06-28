import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PublicSidequest, Trip } from '../types';
import * as tripsApi from '../api/trips';
import * as sidequestsApi from '../api/publicSidequests';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { uploadToCloudinary } from '../utils/image';

type CardSuitFilter = 'all' | 'spades' | 'hearts' | 'diamonds' | 'clubs';

interface CreateFormState {
    title: string;
    description: string;
    location: string;
    cardSuit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
    cardRank: 'J' | 'Q' | 'K' | 'A';
    eventDate: string;
    maxParticipants: number;
    addEvent: boolean;
}

type CardSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
type CardRank = 'J' | 'Q' | 'K' | 'A';

const CARD_SUIT_TABS: { key: CardSuitFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'spades', label: '♠ Spades' },
    { key: 'hearts', label: '♥ Hearts' },
    { key: 'diamonds', label: '♦ Diamonds' },
    { key: 'clubs', label: '♣ Clubs' },
];

const SUIT_SYMBOLS: Record<CardSuit, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };

function getSuitSymbol(suit: CardSuit) { return SUIT_SYMBOLS[suit]; }

function computeXp(cardSuit: CardSuit, cardRank: CardRank): number {
    const BASE_XP: Record<CardRank, number> = { J: 250, Q: 500, K: 750, A: 1000 };
    const MULTIPLIER: Record<CardSuit, number> = { spades: 1.5, hearts: 1.0, diamonds: 1.2, clubs: 1.1 };
    return Math.round(BASE_XP[cardRank] * MULTIPLIER[cardSuit] / 5) * 5;
}

const FW_COLORS = ['#fbbf24', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f97316'];
const FW_SIZES =  [8, 11, 7, 13, 9, 6, 12, 8];
const FW_PARTICLES = Array.from({ length: 28 }, (_, i) => {
    const angle = (i / 28) * Math.PI * 2;
    const r = 130 + (i % 4) * 22;
    return {
        tx: Math.round(Math.cos(angle) * r),
        ty: Math.round(Math.sin(angle) * r),
        color: FW_COLORS[i % FW_COLORS.length],
        delay: (i % 7) * 0.03,
        size: FW_SIZES[i % FW_SIZES.length],
    };
});

export default function SidequestsPage() {
    const { user } = useAuth();
    const [sidequests, setSidequests] = useState<PublicSidequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [locationQuery, setLocationQuery] = useState('');
    const [activeTab, setActiveTab] = useState<CardSuitFilter>('all');
    const [claimingId, setClaimingId] = useState<string | null>(null);
    const [completingId, setCompletingId] = useState<string | null>(null);
    const [photoUrl, setPhotoUrl] = useState('');
    const [addingToTripId, setAddingToTripId] = useState<string | null>(null);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [selectedTripId, setSelectedTripId] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [createForm, setCreateForm] = useState<CreateFormState>({
        title: '',
        description: '',
        location: '',
        cardSuit: 'spades',
        cardRank: 'J',
        eventDate: '',
        maxParticipants: 1,
        addEvent: false,
    });
    const [enrollingId, setEnrollingId] = useState<string | null>(null);
    const [unclaimingId, setUnclaimingId] = useState<string | null>(null);
    const [claimedCard, setClaimedCard] = useState<{ cardSuit: CardSuit; cardRank: CardRank } | null>(null);
    const [completedCard, setCompletedCard] = useState<{ cardSuit: CardSuit; cardRank: CardRank; xp: number } | null>(null);
    const [proofInputMode, setProofInputMode] = useState<'url' | 'file'>('file');
    const [uploadingProof, setUploadingProof] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    async function onCreateSidequest(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        try {
            const newSidequest = await sidequestsApi.createPublicSidequest({
                title: createForm.title,
                description: createForm.description,
                location: createForm.location,
                cardSuit: createForm.cardSuit,
                cardRank: createForm.cardRank,
                ...(createForm.addEvent && {
                    event: {
                        date: createForm.eventDate,
                        maxParticipants: createForm.maxParticipants,
                    }
                })
            });
            setSidequests(prev => [newSidequest, ...prev]);
            setShowCreateForm(false);
            setCreateForm({
                title: '',
                description: '',
                location: '',
                cardSuit: 'spades',
                cardRank: 'J',
                eventDate: '',
                maxParticipants: 1,
                addEvent: false,
            });
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to create sidequest');
        }
    }

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
            setClaimedCard({ cardSuit: updated.cardSuit, cardRank: updated.cardRank });
            setTimeout(() => setClaimedCard(null), 2800);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to claim sidequest');
        } finally {
            setClaimingId(null);
        }
    }

    async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setError('');
        setUploadingProof(true);
        try {
            const url = await uploadToCloudinary(file);
            setPhotoUrl(url);
        } catch {
            setError('Image upload failed. Please try again or paste a URL instead.');
        } finally {
            setUploadingProof(false);
        }
    }

    async function onComplete(id: string) {
        try {
            const updated = await sidequestsApi.completePublicSidequest(id, photoUrl);
            setSidequests(prev => prev.map(s => s._id === id ? updated : s));
            setCompletingId(null);
            setPhotoUrl('');
            setProofInputMode('file');
            const xp = computeXp(updated.cardSuit, updated.cardRank);
            setCompletedCard({ cardSuit: updated.cardSuit, cardRank: updated.cardRank, xp });
            setTimeout(() => setCompletedCard(null), 3500);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to complete sidequest');
        }
    }

    async function onAddToTrip(id: string) {
        setError('');
        try {
            await sidequestsApi.assignClaimToTrip(id, selectedTripId);
            setAddingToTripId(null);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to link sidequest to trip');
        }
    }

    async function onUnclaim(id: string) {
        setUnclaimingId(id);
        setError('');
        try {
            const updated = await sidequestsApi.unclaimPublicSidequest(id);
            setSidequests(prev => prev.map(s => s._id === id ? updated : s));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to unclaim sidequest');
        } finally {
            setUnclaimingId(null);
        }
    }

    async function onLeaveEvent(sidequestId: string) {
        setError('');
        try {
            const updated = await sidequestsApi.leaveEvent(sidequestId);
            setSidequests(prev => prev.map((s) => s._id === sidequestId ? updated : s));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to leave sidequest event');
        }
    }

    async function onEnrollInSidequest(sidequestId: string) {
        setError('');
        try {
            setEnrollingId(sidequestId);
            const updated = await sidequestsApi.enrollInSidequest(sidequestId);
            setSidequests(prev => prev.map((s) => s._id === sidequestId ? updated : s));
            setClaimedCard({ cardSuit: updated.cardSuit, cardRank: updated.cardRank });
            setTimeout(() => setClaimedCard(null), 2800);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to enroll in sidequest');
        } finally {
            setEnrollingId(null);
        }
    }

    const filtered = activeTab === 'all'
        ? sidequests
        : sidequests.filter(s => s.cardSuit === activeTab);

    const counts: Record<CardSuitFilter, number> = {
        all: sidequests.length,
        spades: sidequests.filter(s => s.cardSuit === 'spades').length,
        hearts: sidequests.filter(s => s.cardSuit === 'hearts').length,
        diamonds: sidequests.filter(s => s.cardSuit === 'diamonds').length,
        clubs: sidequests.filter(s => s.cardSuit === 'clubs').length,
    };

    return (
        <div className="page">

            {claimedCard && createPortal(
                <div className="claim-overlay" onClick={() => setClaimedCard(null)}>
                    <div className="claim-card-wrap">
                        <div className={`claim-card claim-card--${claimedCard.cardSuit}`}>
                            <div className="claim-card-corner claim-card-corner--tl">
                                <span className="claim-card-corner-rank">{claimedCard.cardRank}</span>
                                <span className="claim-card-corner-suit">{getSuitSymbol(claimedCard.cardSuit)}</span>
                            </div>
                            <span className="claim-card-center-suit">{getSuitSymbol(claimedCard.cardSuit)}</span>
                            <div className="claim-card-corner claim-card-corner--br">
                                <span className="claim-card-corner-rank">{claimedCard.cardRank}</span>
                                <span className="claim-card-corner-suit">{getSuitSymbol(claimedCard.cardSuit)}</span>
                            </div>
                            <p className="claim-card-label">Claimed!</p>
                        </div>
                    </div>
                    <p className="claim-overlay-hint">tap to dismiss</p>
                </div>,
                document.body
            )}

            {completedCard && createPortal(
                <div className="claim-overlay" onClick={() => setCompletedCard(null)}>
                    <div className="claim-card-wrap complete-card-wrap">
                        {FW_PARTICLES.map((p, i) => (
                            <span
                                key={i}
                                className="fw-particle"
                                style={{
                                    width: p.size,
                                    height: p.size,
                                    background: p.color,
                                    animationDelay: `${p.delay}s`,
                                    marginLeft: -p.size / 2,
                                    marginTop: -p.size / 2,
                                    '--fw-tx': `${p.tx}px`,
                                    '--fw-ty': `${p.ty}px`,
                                } as React.CSSProperties}
                            />
                        ))}
                        <div className={`claim-card claim-card--${completedCard.cardSuit}`}>
                            <div className="claim-card-corner claim-card-corner--tl">
                                <span className="claim-card-corner-rank">{completedCard.cardRank}</span>
                                <span className="claim-card-corner-suit">{getSuitSymbol(completedCard.cardSuit)}</span>
                            </div>
                            <span className="claim-card-center-suit">{getSuitSymbol(completedCard.cardSuit)}</span>
                            <div className="claim-card-corner claim-card-corner--br">
                                <span className="claim-card-corner-rank">{completedCard.cardRank}</span>
                                <span className="claim-card-corner-suit">{getSuitSymbol(completedCard.cardSuit)}</span>
                            </div>
                            <p className="claim-card-label">Completed!</p>
                        </div>
                        <div className="complete-xp-badge">+{completedCard.xp} XP</div>
                    </div>
                    <p className="claim-overlay-hint">tap to dismiss</p>
                </div>,
                document.body
            )}

            {/* Page Hero */}
            <div className="sq-page-hero">
                <h1>Public Sidequests</h1>
                <p>Community travel challenges. Complete them. Earn XP. Build your legend.</p>
                <div className="sq-page-stats">
                    <span className="sq-page-stat-pill sq-page-stat-pill--spades">♠ {counts.spades} Spades</span>
                    <span className="sq-page-stat-pill sq-page-stat-pill--hearts">♥ {counts.hearts} Hearts</span>
                    <span className="sq-page-stat-pill sq-page-stat-pill--diamonds">♦ {counts.diamonds} Diamonds</span>
                    <span className="sq-page-stat-pill sq-page-stat-pill--clubs">♣ {counts.clubs} Clubs</span>
                </div>
            </div>

            {/* Create Form */}
            <section className="card">
                <button type="button" onClick={() => setShowCreateForm(s => !s)}>
                    {showCreateForm ? '✕ Cancel' : '+ Create Sidequest'}
                </button>
                {showCreateForm && (
                    <form onSubmit={onCreateSidequest} className="sq-create-form">
                        <input type="text" value={createForm.title} onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Title..." required />
                        <input type="text" value={createForm.description} onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Description..." />
                        <input type="text" value={createForm.location} onChange={(e) => setCreateForm(prev => ({ ...prev, location: e.target.value }))} placeholder="Location..." />
                        <div className="sq-create-form-row">
                            <div>
                                <label>Card Suit — Category</label>
                                <select value={createForm.cardSuit} onChange={(e) => setCreateForm(prev => ({ ...prev, cardSuit: e.target.value as CreateFormState['cardSuit'] }))} required>
                                    <option value="spades">♠ Spades — Physical</option>
                                    <option value="hearts">♥ Hearts — Social</option>
                                    <option value="diamonds">♦ Diamonds — Intellectual</option>
                                    <option value="clubs">♣ Clubs — Teamwork</option>
                                </select>
                            </div>
                            <div>
                                <label>Card Rank — Difficulty</label>
                                <select value={createForm.cardRank} onChange={(e) => setCreateForm(prev => ({ ...prev, cardRank: e.target.value as CreateFormState['cardRank'] }))} required>
                                    <option value="J">J — Beginner</option>
                                    <option value="Q">Q — Novice</option>
                                    <option value="K">K — Intermediate</option>
                                    <option value="A">A — Advanced</option>
                                </select>
                            </div>
                        </div>
                        <div className="sq-xp-preview">
                            ⚡ {computeXp(createForm.cardSuit, createForm.cardRank)} XP Reward
                        </div>
                        <label className="sq-event-toggle">
                            <input type="checkbox" checked={createForm.addEvent} onChange={() => setCreateForm(prev => ({ ...prev, addEvent: !prev.addEvent }))} />
                            Make this an event with a set date?
                        </label>
                        {createForm.addEvent && (
                            <div className="sq-event-fields">
                                <div>
                                    <label>Event Date & Time</label>
                                    <input type="datetime-local" value={createForm.eventDate} onChange={(e) => setCreateForm(prev => ({ ...prev, eventDate: e.target.value }))} required />
                                </div>
                                <div>
                                    <label>Max Participants</label>
                                    <input type="number" min={1} value={createForm.maxParticipants} onChange={(e) => setCreateForm(prev => ({ ...prev, maxParticipants: Number(e.target.value) }))} />
                                </div>
                            </div>
                        )}
                        <button type="submit">Create Sidequest</button>
                    </form>
                )}
            </section>

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
                {CARD_SUIT_TABS.map(tab => (
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
                            <li key={s._id} className={`card claims-card claims-card--${s.cardSuit}`} style={{ marginBottom: 0 }}>
                                <div className="claims-card-header">
                                    <div className="claims-card-meta">
                                        <span className={`sq-suit-badge suit-${s.cardSuit}`}>
                                            {getSuitSymbol(s.cardSuit)} {s.cardRank}
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

                                {s.event && (
                                    <div className="sq-event-info">
                                        <div className="sq-event-info-header">
                                            <span className="sq-event-date">
                                                📅 {new Date(s.event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                            {s.event.maxParticipants && (
                                                <span className="sq-event-spots">
                                                    {s.event.enrollments.length}/{s.event.maxParticipants} spots
                                                </span>
                                            )}
                                        </div>
                                        {s.event.enrollments.length > 0 && (
                                            <ul className="sq-event-enrolled-list">
                                                {s.event.enrollments.map((e) => (
                                                    <li key={e.userId} className="sq-event-enrolled-item">
                                                        <span>{e.userName}</span>
                                                        <span className="muted small">{new Date(e.enrolledAt).toLocaleDateString()}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        {s.event.enrollments.some((e) => e.userId === user?.id) ? (
                                            <button type="button" className="leave-btn" onClick={() => onLeaveEvent(s._id)}>Leave Event</button>
                                        ) : (
                                            <button type="button" className="enroll-btn" onClick={() => onEnrollInSidequest(s._id)}>
                                                {enrollingId === s._id ? 'Enrolling…' : 'Enroll'}
                                            </button>
                                        )}
                                    </div>
                                )}

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
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => { setCompletingId(s._id); setPhotoUrl(''); }}
                                            >
                                                Submit Proof
                                            </button>
                                            <button
                                                type="button"
                                                className="danger small-btn"
                                                disabled={unclaimingId === s._id}
                                                onClick={() => onUnclaim(s._id)}
                                            >
                                                {unclaimingId === s._id ? '…' : 'Unclaim'}
                                            </button>
                                        </>
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
                                    {trips.length > 0 && isClaimed && (
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
                                        <div className="proof-mode-toggle">
                                            <button
                                                type="button"
                                                className={proofInputMode === 'file' ? 'proof-mode-btn active' : 'proof-mode-btn'}
                                                onClick={() => { setProofInputMode('file'); setPhotoUrl(''); }}
                                            >
                                                Upload Photo
                                            </button>
                                            <button
                                                type="button"
                                                className={proofInputMode === 'url' ? 'proof-mode-btn active' : 'proof-mode-btn'}
                                                onClick={() => { setProofInputMode('url'); setPhotoUrl(''); }}
                                            >
                                                Paste URL
                                            </button>
                                        </div>

                                        {proofInputMode === 'file' ? (
                                            <div className="proof-upload-area" onClick={() => fileInputRef.current?.click()}>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    style={{ display: 'none' }}
                                                    onChange={onPickFile}
                                                />
                                                {uploadingProof ? (
                                                    <span className="proof-upload-hint">Uploading…</span>
                                                ) : photoUrl ? (
                                                    <img src={photoUrl} className="claims-proof-preview" alt="Preview" />
                                                ) : (
                                                    <span className="proof-upload-hint">Click to choose a photo from your device</span>
                                                )}
                                            </div>
                                        ) : (
                                            <>
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
                                            </>
                                        )}

                                        <div className="search-row">
                                            <button type="button" disabled={!photoUrl || uploadingProof} onClick={() => onComplete(s._id)}>
                                                Confirm
                                            </button>
                                            <button type="button" className="ghost" onClick={() => { setCompletingId(null); setPhotoUrl(''); setProofInputMode('file'); }}>
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
