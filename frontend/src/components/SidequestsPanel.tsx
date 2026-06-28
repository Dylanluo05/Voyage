import { useState } from "react";
import { Trip } from "../types";
import { addSidequest, assignSidequest, completeSidequest, removeSidequest, addComment, removeComment, publishSidequest } from "../api/trips";

type CardSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
type CardRank = 'J' | 'Q' | 'K' | 'A';

const SUIT_SYMBOLS: Record<CardSuit, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
const SUIT_LABELS: Record<CardSuit, string> = { spades: 'Physical', hearts: 'Social', diamonds: 'Intellectual', clubs: 'Teamwork' };

function computeXp(suit: CardSuit, rank: CardRank): number {
    const BASE: Record<CardRank, number> = { J: 250, Q: 500, K: 750, A: 1000 };
    const MULT: Record<CardSuit, number> = { spades: 1.5, hearts: 1.0, diamonds: 1.2, clubs: 1.1 };
    return Math.round(BASE[rank] * MULT[suit] / 5) * 5;
}

const FUNNY_GIFS = [
    { label: "Facepalm", url: "https://media.giphy.com/media/XsUtdIeJ0MWMo/giphy.gif" },
    { label: "Mind blown", url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif" },
    { label: "Clapping", url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif" },
    { label: "No no no", url: "https://media.giphy.com/media/12XMGIWtrHBl5e/giphy.gif" },
    { label: "Party", url: "https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif" },
    { label: "Thumbs up", url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif" },
    { label: "Really?", url: "https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif" },
    { label: "Nice", url: "https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif" },
    { label: "Shocked", url: "https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif" },
    { label: "Bye", url: "https://media.giphy.com/media/l1J9GIXk9w7OYsd5S/giphy.gif" },
    { label: "Sigh", url: "https://media.giphy.com/media/LpkLWXTp0v0qy0mAp9/giphy.gif" },
    { label: "Suspicious", url: "https://media.giphy.com/media/l4FB5yXHoVSheWQ5a/giphy.gif" },
];

interface SidequestsPanelProps {
    trip: Trip;
    currentUserId: string | undefined;
    onUpdate: (updated: Trip) => void;
}

export default function SidequestsPanel({ trip, currentUserId, onUpdate }: SidequestsPanelProps) {
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        title: '',
        description: '',
        cardSuit: 'spades' as CardSuit,
        cardRank: 'J' as CardRank,
    });
    const [assigningId, setAssigningId] = useState<string | null>(null);
    const [selectedAssignee, setSelectedAssignee] = useState('');
    const [saving, setSaving] = useState(false);
    const [assignLoadingId, setAssignLoadingId] = useState<string | null>(null);
    const [completingId, setCompletingId] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [commentingId, setCommentingId] = useState<string | null>(null);
    const [removingCommentId, setRemovingCommentId] = useState<string | null>(null);
    const [commentForms, setCommentForms] = useState<Record<string, { text: string; imageUrl: string }>>({});
    const [gifPickerId, setGifPickerId] = useState<string | null>(null);
    const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set());
    const [publishingId, setPublishingId] = useState<string | null>(null);
    const [error, setError] = useState('');

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const updated = await addSidequest(trip._id, {
                title: form.title,
                description: form.description || undefined,
                cardSuit: form.cardSuit,
                cardRank: form.cardRank,
            });
            onUpdate(updated);
            setForm({ title: '', description: '', cardSuit: 'spades', cardRank: 'J' });
            setShowForm(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setSaving(false);
        }
    };

    const handleRemove = async (sidequestId: string) => {
        setRemovingId(sidequestId);
        setError('');
        try {
            onUpdate(await removeSidequest(trip._id, sidequestId));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setRemovingId(null);
        }
    };

    const handleAssign = async (sidequestId: string) => {
        setAssignLoadingId(sidequestId);
        setError('');
        try {
            onUpdate(await assignSidequest(trip._id, sidequestId, selectedAssignee));
            setAssigningId(null);
            setSelectedAssignee('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setAssignLoadingId(null);
        }
    };

    const handleComplete = async (sidequestId: string) => {
        setCompletingId(sidequestId);
        setError('');
        try {
            onUpdate(await completeSidequest(trip._id, sidequestId));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setCompletingId(null);
        }
    };

    const handleAddComment = async (e: React.FormEvent, sidequestId: string) => {
        e.preventDefault();
        setCommentingId(sidequestId);
        setError('');
        try {
            const comment = commentForms[sidequestId];
            onUpdate(await addComment(trip._id, sidequestId, comment));
            setCommentForms(prev => ({ ...prev, [sidequestId]: { text: '', imageUrl: '' } }));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setCommentingId(null);
        }
    };

    const handleRemoveComment = async (sidequestId: string, commentId: string) => {
        setRemovingCommentId(commentId);
        setError('');
        try {
            onUpdate(await removeComment(trip._id, sidequestId, commentId));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setRemovingCommentId(null);
        }
    };

    const handlePublish = async (sidequestId: string) => {
        setPublishingId(sidequestId);
        setError('');
        try {
            await publishSidequest(trip._id, sidequestId);
            setPublishedIds(prev => new Set(prev).add(sidequestId));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setPublishingId(null);
        }
    };

    const previewXp = computeXp(form.cardSuit, form.cardRank);

    return (
        <section id="sidequests-section" className="card">
            <div className="sidequest-header-row">
                <h2>Sidequests</h2>
                <button
                    type="button"
                    className="ghost small-btn"
                    onClick={() => setShowForm(f => !f)}
                >
                    {showForm ? 'Cancel' : '+ Add'}
                </button>
            </div>

            {showForm && (
                <form className="form sq-create-form" onSubmit={handleAdd}>
                    <label>Title
                        <input
                            type="text"
                            placeholder="e.g. Watch the sunrise from a rooftop"
                            value={form.title}
                            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                            required
                        />
                    </label>
                    <label>Description <span className="muted">(optional)</span>
                        <textarea
                            placeholder="What's the challenge?"
                            value={form.description}
                            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                            rows={2}
                        />
                    </label>
                    <div className="sq-create-form-row">
                        <div>
                            <label>Suit — Category
                                <select
                                    value={form.cardSuit}
                                    onChange={e => setForm(p => ({ ...p, cardSuit: e.target.value as CardSuit }))}
                                >
                                    <option value="spades">♠ Spades — Physical</option>
                                    <option value="hearts">♥ Hearts — Social</option>
                                    <option value="diamonds">♦ Diamonds — Intellectual</option>
                                    <option value="clubs">♣ Clubs — Teamwork</option>
                                </select>
                            </label>
                        </div>
                        <div>
                            <label>Rank — Difficulty
                                <select
                                    value={form.cardRank}
                                    onChange={e => setForm(p => ({ ...p, cardRank: e.target.value as CardRank }))}
                                >
                                    <option value="J">J — Beginner</option>
                                    <option value="Q">Q — Novice</option>
                                    <option value="K">K — Intermediate</option>
                                    <option value="A">A — Advanced</option>
                                </select>
                            </label>
                        </div>
                    </div>
                    <div className="sq-xp-preview">⚡ {previewXp} XP reward</div>
                    <button type="submit" disabled={!form.title || saving}>
                        {saving ? 'Adding…' : 'Add Sidequest'}
                    </button>
                </form>
            )}

            {error && <p className="error">{error}</p>}

            {trip.sidequests.length === 0 && (
                <p className="muted">No sidequests yet — add one to challenge your crew.</p>
            )}

            {trip.sidequests.map(s => {
                const suit = (s.cardSuit ?? 'spades') as CardSuit;
                const rank = (s.cardRank ?? 'J') as CardRank;
                const xp = computeXp(suit, rank);
                const commentForm = commentForms[s._id] ?? { text: '', imageUrl: '' };
                const isPublished = publishedIds.has(s._id);

                return (
                    <div key={s._id} className={`sidequest-card sidequest-card--${suit}`}>
                        {/* Card meta row */}
                        <div className="sidequest-card-meta">
                            <span className={`sq-suit-badge suit-${suit}`}>
                                {SUIT_SYMBOLS[suit]} {SUIT_LABELS[suit]}
                            </span>
                            <span className="sq-rank-badge">{rank}</span>
                            <span className="xp-badge">+{xp} XP</span>
                            {s.completed && <span className="completed-badge">Completed ✓</span>}
                        </div>

                        {/* Title */}
                        <h3 className="sidequest-card-header">{s.title}</h3>
                        {s.description && <p className="muted small" style={{ marginTop: 2 }}>{s.description}</p>}

                        {/* Assignment info */}
                        {s.assignee && s.assigner && (
                            <p className="sidequest-assignment">
                                Assigned to <strong>{s.assignee.userName}</strong> by {s.assigner.userName}
                            </p>
                        )}

                        {/* Actions */}
                        <div className="sidequest-actions">
                            {assigningId === s._id ? (
                                <div className="sidequest-assign-row">
                                    <select
                                        value={selectedAssignee}
                                        onChange={e => setSelectedAssignee(e.target.value)}
                                    >
                                        <option value="">Select member…</option>
                                        {[trip.owner, ...trip.collaborators]
                                            .filter(c => c._id !== currentUserId)
                                            .map(c => (
                                                <option key={c._id} value={c._id}>{c.name}</option>
                                            ))}
                                    </select>
                                    <button
                                        type="button"
                                        className="small-btn"
                                        disabled={!selectedAssignee || assignLoadingId === s._id}
                                        onClick={() => handleAssign(s._id)}
                                    >
                                        Confirm
                                    </button>
                                    <button
                                        type="button"
                                        className="ghost small-btn"
                                        onClick={() => { setAssigningId(null); setSelectedAssignee(''); }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className="ghost small-btn"
                                    disabled={s.completed}
                                    onClick={() => setAssigningId(s._id)}
                                >
                                    Assign
                                </button>
                            )}

                            {currentUserId === s.assigner?.userId && !s.completed && (
                                <button
                                    type="button"
                                    className="ghost small-btn"
                                    disabled={completingId === s._id}
                                    onClick={() => handleComplete(s._id)}
                                >
                                    {completingId === s._id ? 'Completing…' : 'Mark Complete'}
                                </button>
                            )}

                            {trip.owner._id === currentUserId && (
                                <button
                                    type="button"
                                    className="ghost small-btn"
                                    disabled={isPublished || publishingId === s._id}
                                    onClick={() => handlePublish(s._id)}
                                >
                                    {publishingId === s._id ? 'Publishing…' : isPublished ? '✓ Published' : 'Publish'}
                                </button>
                            )}

                            <button
                                type="button"
                                className="danger small-btn"
                                disabled={removingId === s._id}
                                onClick={() => handleRemove(s._id)}
                            >
                                Remove
                            </button>
                        </div>

                        {/* Comments */}
                        {s.comments.length > 0 && (
                            <div className="sidequest-comments">
                                {s.comments.map(c => (
                                    <div key={c._id} className="sidequest-comment">
                                        <div className="sidequest-comment-header">
                                            <span className="sidequest-comment-author">{c.userName}</span>
                                            <span className="muted sidequest-comment-time">{c.createdAt}</span>
                                        </div>
                                        <p className="sidequest-comment-text">{c.text}</p>
                                        {c.imageUrl && <img className="sidequest-comment-image" src={c.imageUrl} alt="" />}
                                        {c.userId === currentUserId && (
                                            <button
                                                type="button"
                                                className="ghost small-btn sidequest-comment-remove"
                                                disabled={removingCommentId === c._id}
                                                onClick={() => handleRemoveComment(s._id, c._id)}
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <form className="sidequest-comment-form" onSubmit={e => handleAddComment(e, s._id)}>
                            <input
                                type="text"
                                placeholder="Add a comment…"
                                value={commentForm.text}
                                onChange={e => setCommentForms(prev => ({ ...prev, [s._id]: { ...commentForm, text: e.target.value } }))}
                            />
                            <div className="sidequest-image-row">
                                <input
                                    type="text"
                                    placeholder="Image URL (optional)…"
                                    value={commentForm.imageUrl}
                                    onChange={e => setCommentForms(prev => ({ ...prev, [s._id]: { ...commentForm, imageUrl: e.target.value } }))}
                                />
                                <button
                                    type="button"
                                    className="ghost small-btn"
                                    onClick={() => setGifPickerId(gifPickerId === s._id ? null : s._id)}
                                >
                                    {gifPickerId === s._id ? 'Close' : '🎬 GIF'}
                                </button>
                            </div>
                            {gifPickerId === s._id && (
                                <div className="gif-picker">
                                    {FUNNY_GIFS.map(gif => (
                                        <img
                                            key={gif.url}
                                            src={gif.url}
                                            alt={gif.label}
                                            title={gif.label}
                                            className="gif-thumb"
                                            onClick={() => {
                                                setCommentForms(prev => ({ ...prev, [s._id]: { ...commentForm, imageUrl: gif.url } }));
                                                setGifPickerId(null);
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                            <button
                                type="submit"
                                className="ghost small-btn"
                                disabled={!commentForm.text || commentingId === s._id}
                            >
                                Post
                            </button>
                        </form>
                    </div>
                );
            })}
        </section>
    );
}
