import { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { getProfile, addBadge, removeBadge } from "../api/users";
import { getLeaderboard } from "../api/publicSidequests";
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
    const [flippedId, setFlippedId] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
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

    useEffect(() => {
        if (!user) return;
        getLeaderboard().then(entries => {
            const pos = entries.findIndex(e => e._id === user.id);
            if (pos !== -1) setLeaderboardRank(pos + 1);
        }).catch(() => {});
    }, [user]);

    const determineRank = (xp: number): [string, string, number, number] => {
        const thresholds = [{ name: 'Recruit', value: 0 }, { name: 'Wanderer', value: 1000 }, { name: 'Adventurer', value: 2000 }, { name: 'Explorer', value: 4000 }, { name: 'Veteran', value: 7000 }, { name: 'Champion', value: 10000 }, { name: 'Legend', value: 15000 }, { name: 'Voyager', value: 20000 }];
        let index;

        if (xp >= thresholds[7].value) {
            index = 7;
        } else if (xp >= thresholds[6].value) {
            index = 6;
        } else if (xp >= thresholds[5].value) {
            index = 5;
        } else if (xp >= thresholds[4].value) {
            index = 4;
        } else if (xp >= thresholds[3].value) {
            index = 3;
        } else if (xp >= thresholds[2].value) {
            index = 2;
        } else if (xp >= thresholds[1].value) {
            index = 1;
        } else {
            index = 0;
        }

        const rank = thresholds[index].name;
        const nextRank = index < 7 ? thresholds[index + 1].name : '';

        const xpBeforeNextRank = index < 7 ? thresholds[index + 1].value - xp : 0;
        const percentageBeforeNextRank = index < 7 ? Math.round((xp - thresholds[index].value) / (thresholds[index + 1].value - thresholds[index].value) * 100) : 100;

        return [rank, nextRank, xpBeforeNextRank, percentageBeforeNextRank];
    };

    const getSuitSymbol = (suit: 'spades' | 'hearts' | 'diamonds' | 'clubs'): string => {
        const SUIT_SYMBOL_MAPPINGS = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }
        return SUIT_SYMBOL_MAPPINGS[suit];
    };

    const getSuitLabel = (suit: 'spades' | 'hearts' | 'diamonds' | 'clubs'): string => {
        const SUIT_LABEL_MAPPINGS = { spades: 'Physical', hearts: 'Social', diamonds: 'Intellectual', clubs: 'Teamwork' };
        return SUIT_LABEL_MAPPINGS[suit];
    };

    const getSuitColor = (suit: 'spades' | 'hearts' | 'diamonds' | 'clubs'): string => {
        const SUIT_COLOR_MAPPINGS = { spades: '#33415533', hearts: '#ef444433', diamonds: '#3b82f633', clubs: '#10b98133' };
        return SUIT_COLOR_MAPPINGS[suit];
    };

    const [rank, nextRank, xpBeforeNextRank, percentageBeforeNextRank] = profile ? determineRank(profile.xp) : ['', '', 1000, 0];

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

            {profile && (
                <section className="card">
                    <h2>Total XP:</h2>
                    <div className="row" style={{ gap: '3rem' }}>
                        <span className="gradient-text"><strong>{profile.xp}</strong> xp</span>
                        {rank !== '' && <span className="gradient-text">Current rank: {rank}</span>}
                        {nextRank !== '' && <span className="gradient-text">{xpBeforeNextRank} xp before next rank: {nextRank}</span>}
                        <span className="gradient-text">Current rank percentage: {percentageBeforeNextRank}%</span>
                        {leaderboardRank !== null && <span className="gradient-text">Global rank: #{leaderboardRank}</span>}
                    </div>
                    <br />
                    <div className="budget-progress-bar">
                        <div className="budget-progress-fill" style={{ width: percentageBeforeNextRank + '%', backgroundColor: 'var(--violet)' }}></div>
                    </div>
                </section>
            )}

            {profile && (
                <section className="card">
                    <h2>Past Sidequests</h2>
                    <div className="flip-cards-grid">
                        {profile.sidequestHistory.length > 0 ? profile.sidequestHistory.map((s) => (
                            <div key={s._id} onClick={() => setFlippedId(prev => prev === s._id ? null : s._id)} className="flip-card">
                                <div className={`flip-card-inner${s._id === flippedId ? ' flipped' : ''}`}>
                                    <div className="flip-card-front" style={{ background: `linear-gradient(135deg, var(--card-bg) 40%, ${getSuitColor(s.cardSuit)})` }}>
                                        <span className={`flip-card-suit suit-${s.cardSuit}`}>{getSuitSymbol(s.cardSuit)}</span>
                                        <span className="flip-card-rank">{s.cardRank}</span>
                                        <span className="past-sidequest-title">{s.title}</span>
                                    </div>
                                    <div className="flip-card-back" style={{ border: `1px solid ${getSuitColor(s.cardSuit)}` }}>
                                        <span style={{ fontWeight: 600, fontSize: 12, textAlign: 'center' }}>{s.title}</span>
                                        <span className="muted small">{getSuitLabel(s.cardSuit)}</span>
                                        <span className="muted small">{new Date(s.completedAt).toLocaleDateString()}</span>
                                        <span className="xp-badge">+{s.xpEarned} xp</span>
                                    </div>
                                </div>
                            </div>
                        )) : <p>No sidequests completed yet...</p>}
                    </div>
                </section>
            )
            }

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
        </div >
    );
}
