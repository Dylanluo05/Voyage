import { useState, useEffect, useRef } from "react";
import { UserProfile } from "../types";
import { getProfile, updateProfile } from "../api/users";
import { getLeaderboard } from "../api/publicSidequests";
import { useAuth } from "../context/AuthContext";
import { uploadToCloudinary } from "../utils/image";


function getInitials(name: string): string {
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function AvatarDisplay({ avatarUrl, name, size = 72 }: { avatarUrl?: string; name: string; size?: number }) {
    if (avatarUrl) {
        return (
            <img
                src={avatarUrl}
                alt={name}
                className="profile-avatar-img"
                style={{ width: size, height: size }}
            />
        );
    }
    return (
        <div className="profile-avatar-initials" style={{ width: size, height: size, fontSize: size * 0.35 }}>
            {getInitials(name)}
        </div>
    );
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
    const [flippedId, setFlippedId] = useState<string | null>(null);
    const { user } = useAuth();

    // Profile edit state
    const [editingBio, setEditingBio] = useState(false);
    const [editingWishlist, setEditingWishlist] = useState(false);
    const [editBio, setEditBio] = useState('');
    const [editWishlist, setEditWishlist] = useState<string[]>([]);
    const [newWishlistItem, setNewWishlistItem] = useState('');
    const [savingBio, setSavingBio] = useState(false);
    const [savingWishlist, setSavingWishlist] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const loadUserProfile = async () => {
        try {
            const p = await getProfile();
            setProfile(p);
            setEditBio(p.bio ?? '');
            setEditWishlist(p.wishlist ?? []);
        } catch {
            // silently fail
        }
    };

    const handleAvatarUpload = async (file: File) => {
        try {
            setUploadingAvatar(true);
            const url = await uploadToCloudinary(file);
            const updated = await updateProfile({ avatarUrl: url });
            setProfile(updated);
        } catch {
            // silently fail
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleSaveBio = async () => {
        try {
            setSavingBio(true);
            const updated = await updateProfile({ bio: editBio || undefined });
            setProfile(updated);
            setEditingBio(false);
        } catch {
            // silently fail
        } finally {
            setSavingBio(false);
        }
    };

    const handleSaveWishlist = async () => {
        try {
            setSavingWishlist(true);
            const updated = await updateProfile({ wishlist: editWishlist });
            setProfile(updated);
            setEditingWishlist(false);
        } catch {
            // silently fail
        } finally {
            setSavingWishlist(false);
        }
    };

    const addWishlistItem = () => {
        const item = newWishlistItem.trim();
        if (!item || editWishlist.includes(item)) return;
        setEditWishlist(prev => [...prev, item]);
        setNewWishlistItem('');
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
    const displayName = profile?.name ?? user?.name ?? '';

    return (
        <div className="page">
            <h1>Profile</h1>

            {/* Identity card */}
            <section className="card">
                <div className="profile-identity-row">
                    {/* Avatar */}
                    <div className="profile-avatar-wrap">
                        <AvatarDisplay avatarUrl={profile?.avatarUrl} name={displayName} size={80} />
                        <button
                            type="button"
                            className="profile-avatar-edit-btn"
                            title="Change photo"
                            disabled={uploadingAvatar}
                            onClick={() => avatarInputRef.current?.click()}
                        >
                            {uploadingAvatar ? '…' : '✎'}
                        </button>
                        <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.target.value = ''; }}
                        />
                    </div>

                    {/* Name, email, bio */}
                    <div className="profile-identity-info">
                        <h2 style={{ margin: 0 }}>{displayName}</h2>
                        {profile && (
                            <>
                                <p className="muted small" style={{ margin: '2px 0 0' }}>{profile.email}</p>
                                <p className="muted small" style={{ margin: '2px 0 0' }}>Member since: {new Date(profile.createdAt).toLocaleDateString()}</p>
                                {!editingBio && (
                                    profile.bio
                                        ? <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.5 }}>{profile.bio}</p>
                                        : <button type="button" className="profile-add-bio-prompt" onClick={() => { setEditBio(''); setEditingBio(true); }}>+ Add a bio</button>
                                )}
                            </>
                        )}
                    </div>

                    <button
                        type="button"
                        className="ghost small-btn"
                        style={{ alignSelf: 'flex-start', marginLeft: 'auto' }}
                        onClick={() => { setEditBio(profile?.bio ?? ''); setEditingBio(e => !e); }}
                    >
                        {editingBio ? 'Cancel' : 'Edit bio'}
                    </button>
                </div>

                {editingBio && (
                    <div className="profile-edit-form" style={{ marginTop: 16 }}>
                        <label style={{ display: 'block', marginBottom: 12 }}>
                            <span className="muted small" style={{ display: 'block', marginBottom: 4 }}>Bio (max 300 chars)</span>
                            <textarea
                                value={editBio}
                                onChange={e => setEditBio(e.target.value)}
                                maxLength={300}
                                rows={3}
                                placeholder="Tell other travellers about yourself…"
                                style={{ width: '100%', resize: 'vertical' }}
                                autoFocus
                            />
                            <span className="muted small">{editBio.length}/300</span>
                        </label>
                        <button type="button" disabled={savingBio} onClick={handleSaveBio}>
                            {savingBio ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                )}
            </section>

            {/* Wishlist */}
            <section className="card">
                <div className="sidequest-header-row">
                    <h2>Travel Wishlist</h2>
                    <button type="button" className="ghost small-btn" onClick={() => { setEditWishlist(profile?.wishlist ?? []); setEditingWishlist(e => !e); }}>
                        {editingWishlist ? 'Cancel' : 'Edit'}
                    </button>
                </div>

                {profile && profile.wishlist.length > 0 ? (
                    <div className="profile-wishlist">
                        {(editingWishlist ? editWishlist : profile.wishlist).map((place, i) => (
                            <div key={i} className="profile-wishlist-item">
                                <span>✈ {place}</span>
                                {editingWishlist && (
                                    <button
                                        type="button"
                                        className="danger small-btn"
                                        style={{ padding: '2px 8px', fontSize: 11 }}
                                        onClick={() => setEditWishlist(prev => prev.filter((_, idx) => idx !== i))}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    !editingWishlist && <p className="muted small">No destinations on your wishlist yet.</p>
                )}

                {editingWishlist && (
                    <div style={{ marginTop: 12 }}>
                        <div className="search-row">
                            <input
                                placeholder="Add a destination…"
                                value={newWishlistItem}
                                onChange={e => setNewWishlistItem(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addWishlistItem()}
                                autoFocus
                            />
                            <button type="button" onClick={addWishlistItem} disabled={!newWishlistItem.trim()}>Add</button>
                        </div>
                        <button type="button" style={{ marginTop: 10 }} disabled={savingWishlist} onClick={handleSaveWishlist}>
                            {savingWishlist ? 'Saving…' : 'Save Wishlist'}
                        </button>
                    </div>
                )}
            </section>

            {/* XP & Rank */}
            {profile && (
                <section className="card">
                    <h2>Total XP:</h2>
                    <div className="profile-xp-row">
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

            {/* Past Sidequests */}
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
            )}

        </div>
    );
}
