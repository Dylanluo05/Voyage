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
    const [form, setForm] = useState({
        destination: '',
        countryCode: '',
    });
    const [saving, setSaving] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const { user } = useAuth();

    const loadUserProfile = async () => {
        try {
            setLoading(true);
            const userProfile = await getProfile();
            setProfile(userProfile);
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
            const updated = await removeBadge(badgeId);
            setProfile(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setRemovingId(null);
        }
    };

    useEffect(() => {
        loadUserProfile();
    }, []);

    return (
        <div className="page">
            <h1>Profile</h1>

            <section className="card">
                <h2>{profile && profile.name}</h2>
                <h3>Email: {profile && profile.email}</h3>
                <h3>Member since: {profile && new Date(profile.createdAt).toLocaleDateString()}</h3>
            </section>

            <section className="card">
                <h2>Badges</h2>
                <button onClick={() => setShowForm(f => !f)}>{showForm ? 'Cancel' : '+ Add'}</button>
                {showForm && (
                    <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }}>
                        <label htmlFor="destination">Destination:</label>
                        <input id="destination" placeholder="e.g. NYC..." value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
                        <label htmlFor="country-code">Country Code:</label>
                        <input id="country-code" placeholder="e.g. US" maxLength={2} value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value })} />
                        <input disabled={!form.destination || saving} type="submit" value="Submit" />
                    </form>
                )}
                {error && <p className="error">{error}</p>}
                {loading && <h3>Loading...</h3>}
                {profile?.badges && profile.badges.length > 0 ? (
                    <div className="profile-badges-grid">
                        {profile.badges.map(b => (
                            <div key={b._id} className="profile-badge-card">
                                <span className="profile-badge-flag">{b.countryCode ? getFlagEmoji(b.countryCode) : '🌍'}</span>
                                <p>{b.destination}</p>
                                <span className="profile-badge-source">{b.source === 'auto' ? 'Auto' : 'Manual'}</span>
                                <button disabled={removingId === b._id} onClick={() => handleRemove(b._id)}>Remove</button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p>No badges yet</p>
                )}
            </section>
        </div>
    );
}