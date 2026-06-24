import { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { getProfile, addBadge, removeBadge } from "../api/users";
import { useAuth } from "../context/AuthContext";

function getFlagEmoji(countryCode: string): string {
    return [...countryCode.toUpperCase()].map(c =>
        String.fromCodePoint(127397 + c.charCodeAt(0))
    ).join('');
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ destination: '', countryCode: '' });
    const [saving, setSaving] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const { user } = useAuth();

    const loadUserProfile = async () => {
        try {
            setLoading(true);
            setProfile(await getProfile());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        try {
            setSaving(true);
            const updated = await addBadge({ ...form, countryCode: form.countryCode || undefined });
            setProfile(updated);
            setShowForm(false);
            setForm({ destination: '', countryCode: '' });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setSaving(false);
        }
    };

    const handleRemove = async (badgeId: string) => {
        try {
            setRemovingId(badgeId);
            setProfile(await removeBadge(badgeId));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setRemovingId(null);
        }
    };

    useEffect(() => { loadUserProfile(); }, []);

    return (
        <div className="page">
            <h1>Profile</h1>

            <section className="card">
                <h2>{profile?.name ?? user?.name}</h2>
                {profile && (
                    <>
                        <p className="muted small">Email: {profile.email}</p>
                        <p className="muted small">Member since: {new Date(profile.createdAt).toLocaleDateString()}</p>
                    </>
                )}
            </section>

            <section className="card">
                <div className="sidequest-header-row">
                    <h2>Badges</h2>
                    <button
                        type="button"
                        className="ghost small-btn"
                        onClick={() => setShowForm(f => !f)}
                    >
                        {showForm ? 'Cancel' : '+ Add Badge'}
                    </button>
                </div>

                {showForm && (
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleAdd(); }}
                        className="form grid-2"
                        style={{ marginBottom: '20px' }}
                    >
                        <label>
                            Destination
                            <input
                                id="destination"
                                placeholder="e.g. New York City"
                                value={form.destination}
                                onChange={(e) => setForm({ ...form, destination: e.target.value })}
                            />
                        </label>
                        <label>
                            Country Code
                            <input
                                id="country-code"
                                placeholder="e.g. US"
                                maxLength={2}
                                value={form.countryCode}
                                onChange={(e) => setForm({ ...form, countryCode: e.target.value.toUpperCase() })}
                            />
                        </label>
                        <button
                            type="submit"
                            className="full-width"
                            disabled={!form.destination || saving}
                        >
                            {saving ? 'Saving…' : 'Add Badge'}
                        </button>
                    </form>
                )}

                {error && <div className="error">{error}</div>}

                {loading ? (
                    <p className="muted small">Loading…</p>
                ) : profile?.badges && profile.badges.length > 0 ? (
                    <div className="profile-badges-grid">
                        {profile.badges.map(b => (
                            <div key={b._id} className="profile-badge-card">
                                <span className="profile-badge-flag">
                                    {b.countryCode ? getFlagEmoji(b.countryCode) : '🌍'}
                                </span>
                                <p style={{ margin: '0', fontSize: '13px', fontWeight: 600 }}>{b.destination}</p>
                                <span className="profile-badge-source">
                                    {b.source === 'auto' ? 'Auto' : 'Manual'}
                                </span>
                                <button
                                    type="button"
                                    className="danger small-btn"
                                    disabled={removingId === b._id}
                                    onClick={() => handleRemove(b._id)}
                                >
                                    {removingId === b._id ? '…' : 'Remove'}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="muted small">No badges yet — add destinations you've visited.</p>
                )}
            </section>
        </div>
    );
}
