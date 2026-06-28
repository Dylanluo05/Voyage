import { useState, useEffect } from 'react';
import { PublicSidequest } from '../types';
import { getSidequestsByTrip, unassignClaimFromTrip } from '../api/publicSidequests';
import { useAuth } from '../context/AuthContext';

const SUIT_SYMBOL: Record<string, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
const SUIT_LABEL: Record<string, string> = { spades: 'Physical', hearts: 'Social', diamonds: 'Intellectual', clubs: 'Teamwork' };
const SUIT_COLOR: Record<string, string> = { spades: '#33415533', hearts: '#ef444433', diamonds: '#3b82f633', clubs: '#10b98133' };
const SUIT_BORDER: Record<string, string> = { spades: '#334155', hearts: '#ef4444', diamonds: '#3b82f6', clubs: '#10b981' };

interface Props {
    tripId: string;
}

export default function LinkedSidequestsPanel({ tripId }: Props) {
    const { user } = useAuth();
    const [sidequests, setSidequests] = useState<PublicSidequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [flippedId, setFlippedId] = useState<string | null>(null);
    const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        getSidequestsByTrip(tripId)
            .then(setSidequests)
            .catch(() => setError('Failed to load linked sidequests'))
            .finally(() => setLoading(false));
    }, [tripId]);

    async function onUnlink(sq: PublicSidequest) {
        setUnlinkingId(sq._id);
        setError('');
        try {
            await unassignClaimFromTrip(sq._id);
            setSidequests(prev => prev.filter(s => s._id !== sq._id));
            setFlippedId(null);
        } catch {
            setError('Failed to unlink sidequest');
        } finally {
            setUnlinkingId(null);
        }
    }

    if (loading) return <p className="muted small">Loading sidequests…</p>;

    return (
        <section className="card linked-sq-panel">
            <div className="sidequest-header-row">
                <h2>Sidequests</h2>
                <a href="/sidequests" className="ghost small-btn" style={{ textDecoration: 'none' }}>Browse & Add</a>
            </div>
            {error && <p className="error small">{error}</p>}
            {sidequests.length === 0 ? (
                <p className="muted small">No sidequests linked to this trip yet. Browse public sidequests and use <strong>+ Add to Trip</strong> to link them here.</p>
            ) : (
                <div className="flip-cards-grid">
                    {sidequests.map(s => {
                        const isCompleted = s.completions.some(c => c.userId === user?.id);
                        const claim = s.claims.find(c => c.userId === user?.id);
                        return (
                            <div
                                key={s._id}
                                className="flip-card"
                                onClick={() => setFlippedId(prev => prev === s._id ? null : s._id)}
                            >
                                <div className={`flip-card-inner${flippedId === s._id ? ' flipped' : ''}`}>
                                    <div
                                        className="flip-card-front"
                                        style={{ background: `linear-gradient(135deg, var(--card-bg) 40%, ${SUIT_COLOR[s.cardSuit]})` }}
                                    >
                                        <span className={`flip-card-suit suit-${s.cardSuit}`}>{SUIT_SYMBOL[s.cardSuit]}</span>
                                        <span className="flip-card-rank">{s.cardRank}</span>
                                        <span className="past-sidequest-title">{s.title}</span>
                                        {isCompleted && (
                                            <span className="completed-badge" style={{ fontSize: 10, marginTop: 4 }}>✓ Done</span>
                                        )}
                                    </div>
                                    <div
                                        className="flip-card-back"
                                        style={{ border: `1px solid ${SUIT_BORDER[s.cardSuit]}` }}
                                    >
                                        <span style={{ fontWeight: 600, fontSize: 12, textAlign: 'center' }}>{s.title}</span>
                                        <span className="muted small">{SUIT_LABEL[s.cardSuit]}</span>
                                        {isCompleted ? (
                                            <span className="completed-badge">✓ Completed</span>
                                        ) : (
                                            <span className="muted small">In progress</span>
                                        )}
                                        <span className="xp-badge">+{s.xpReward} xp</span>
                                        {claim && (
                                            <span className="muted small" style={{ fontSize: 10 }}>
                                                Added {new Date(claim.claimedAt).toLocaleDateString()}
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            className="danger small-btn"
                                            style={{ marginTop: 6, fontSize: 11 }}
                                            disabled={unlinkingId === s._id}
                                            onClick={e => { e.stopPropagation(); onUnlink(s); }}
                                        >
                                            {unlinkingId === s._id ? '…' : 'Unlink'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
