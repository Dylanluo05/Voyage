import { useState } from "react";
import { Trip } from "../types";
import { addSidequest, assignSidequest, completeSidequest, removeSidequest, addComment, removeComment, publishSidequest } from "../api/trips";

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
    const [showForm, setShowForm] = useState<boolean>(false);
    const [form, setForm] = useState({
        title: '',
        description: '',
    });
    const [assigningId, setAssigningId] = useState<string | null>(null);
    const [selectedAssignee, setSelectedAssignee] = useState('');
    const [saving, setSaving] = useState<boolean>(false);
    const [assignLoadingId, setAssignLoadingId] = useState<string | null>(null);
    const [completingId, setCompletingId] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [commentingId, setCommentingId] = useState<string | null>(null);
    const [removingCommentId, setRemovingCommentId] = useState<string | null>(null);
    const [commentForms, setCommentForms] = useState<Record<string, { text: string; imageUrl: string }>>({});
    const [gifPickerId, setGifPickerId] = useState<string | null>(null);
    const [error, setError] = useState('');

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const updated = await addSidequest(trip._id, {
                title: form.title,
                description: form.description || undefined
            });
            onUpdate(updated);
            setForm({
                title: '',
                description: '',
            });
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
            const updated = await removeSidequest(trip._id, sidequestId);
            onUpdate(updated);
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
            const updated = await assignSidequest(trip._id, sidequestId, selectedAssignee);
            onUpdate(updated);
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
            const updated = await completeSidequest(trip._id, sidequestId);
            onUpdate(updated);
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
            const updated = await addComment(trip._id, sidequestId, comment);
            onUpdate(updated);
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
            const updated = await removeComment(trip._id, sidequestId, commentId);
            onUpdate(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setRemovingCommentId(null);
        }
    };

    const handlePublishSidequest = async (sidequestId: string) => {
        setError('');
        try {
            await publishSidequest(trip._id, sidequestId);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        }
    };

    return (
        <section id="sidequests-section" className="card">
            <div className="sidequest-header-row">
                <h2>Sidequests</h2>
                <button onClick={() => setShowForm(showForm => !showForm)}>{showForm ? 'Cancel' : '+ Add'}</button>
            </div>
            {showForm && (
                <form className="form" onSubmit={handleAdd}>
                    <label htmlFor="sidequest-title">Title</label>
                    <input id="sidequest-title" type="text" placeholder="Title..." value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} />
                    <label htmlFor="sidequest-description">Description</label>
                    <textarea id="sidequest-description" placeholder="Description..." value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} />
                    <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Submit'}</button>
                </form>
            )}
            {error && <p className="error">{error}</p>}
            {trip.sidequests.length > 0 ? (
                trip.sidequests.map(s => {
                    const commentForm = commentForms[s._id] ?? { text: '', imageUrl: '' };
                    return (
                        <div key={s._id} className="sidequest-card">
                            {trip.owner._id === currentUserId && <button type="button" onClick={() => handlePublishSidequest(s._id)}>Publish</button>}
                            <div className="sidequest-card-top">
                                <h3 className="sidequest-card-header">{s.title}</h3>
                                {s.completed && <span className="completed-badge">Completed</span>}
                            </div>
                            {s.description && (
                                <p className="muted">{s.description}</p>
                            )}
                            {s.assignee && s.assigner && (
                                <p className="sidequest-assignment">Assigned to {s.assignee.userName} by {s.assigner.userName}</p>
                            )}

                            <div className="sidequest-actions">
                                {assigningId === s._id ? (
                                    <div className="sidequest-assign-row">
                                        <select value={selectedAssignee} onChange={(e) => setSelectedAssignee(e.target.value)}>
                                            <option value="">Select member...</option>
                                            {[trip.owner, ...trip.collaborators].filter(c => c._id !== currentUserId).map(c => (
                                                <option key={c._id} value={c._id}>{c.name}</option>
                                            ))}
                                        </select>
                                        <button disabled={!selectedAssignee || assignLoadingId === s._id} onClick={() => handleAssign(s._id)}>Confirm</button>
                                        <button onClick={() => { setAssigningId(null); setSelectedAssignee(''); }}>Cancel</button>
                                    </div>
                                ) : (
                                    <button disabled={s.completed} onClick={() => setAssigningId(s._id)}>Assign</button>
                                )}
                                {(currentUserId === s.assigner?.userId && !s.completed) && <button disabled={completingId === s._id} onClick={() => handleComplete(s._id)}>Complete</button>}
                                <button disabled={removingId === s._id} onClick={() => handleRemove(s._id)}>Remove</button>
                            </div>

                            <div className="sidequest-comments">
                                {s.comments.map(c => (
                                    <div key={c._id} className="sidequest-comment">
                                        <div className="sidequest-comment-header">
                                            <span className="sidequest-comment-author">{c.userName}</span>
                                            <span className="muted sidequest-comment-time">{c.createdAt}</span>
                                        </div>
                                        <p className="sidequest-comment-text">{c.text}</p>
                                        {c.imageUrl && <img className="sidequest-comment-image" src={c.imageUrl} />}
                                        {c.userId === currentUserId && <button className="sidequest-comment-remove" onClick={() => handleRemoveComment(s._id, c._id)}>Remove</button>}
                                    </div>
                                ))}
                            </div>

                            <form className="sidequest-comment-form" onSubmit={(e) => handleAddComment(e, s._id)}>
                                <input type="text" placeholder="Add a comment..." value={commentForm.text} onChange={(e) => setCommentForms(prev => ({ ...prev, [s._id]: { ...commentForm, text: e.target.value } }))} />
                                <div className="sidequest-image-row">
                                    <input type="text" placeholder="Image URL (optional)..." value={commentForm.imageUrl} onChange={(e) => setCommentForms(prev => ({ ...prev, [s._id]: { ...commentForm, imageUrl: e.target.value } }))} />
                                    <button type="button" onClick={() => setGifPickerId(gifPickerId === s._id ? null : s._id)}>
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
                                <button disabled={!commentForm.text || commentingId === s._id} type="submit">Post</button>
                            </form>
                        </div>
                    )
                })
            ) : (
                <p>No sidequests added yet</p>
            )}
        </section>
    );
}