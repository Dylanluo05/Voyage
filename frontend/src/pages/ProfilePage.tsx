import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { UserProfile } from "../types";
import { getProfile, updateProfile } from "../api/users";
import { getLeaderboard } from "../api/publicSidequests";
import { useAuth } from "../context/AuthContext";
import { uploadToCloudinary } from "../utils/image";
import Reveal from "../components/Reveal";
import CountUp from "../components/CountUp";
import { Icon } from "../components/Icon";
import { RANKS, rankFor } from "../utils/ranks";
import { SUITS, SUIT_ORDER } from "../components/quests/questMeta";


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

    const displayName = profile?.name ?? user?.name ?? '';
    const xp = profile?.xp ?? 0;
    const r = rankFor(xp);
    const history = [...(profile?.sidequestHistory ?? [])].sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    );
    const bySuit = SUIT_ORDER.map(suit => {
        const items = history.filter(h => h.cardSuit === suit);
        return { suit, count: items.length, xp: items.reduce((sum, h) => sum + h.xpEarned, 0) };
    });

    return (
        <div className="pf">
            {/* Hero: who you are and how far you have come */}
            <Reveal as="header" className="pf-hero" variant="up">
                <div className="pf-id">
                    <div className="profile-avatar-wrap pf-avatar">
                        <AvatarDisplay avatarUrl={profile?.avatarUrl} name={displayName} size={132} />
                        <button
                            type="button"
                            className="profile-avatar-edit-btn"
                            title="Change photo"
                            disabled={uploadingAvatar}
                            onClick={() => avatarInputRef.current?.click()}
                        >
                            {uploadingAvatar ? '…' : <Icon name="camera" size={16} />}
                        </button>
                        <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.target.value = ''; }}
                        />
                    </div>

                    <div className="pf-id-text">
                        <p className="pf-rankchip"><Icon name="crown" size={15} weight="fill" /> {r.name} · level {r.index + 1}</p>
                        <h1 className="pf-name">{displayName}</h1>
                        {profile && (
                            <p className="pf-meta">
                                {profile.email}
                                <span>Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                            </p>
                        )}
                    </div>
                </div>

                {profile && (
                    <div className="pf-bio">
                        {editingBio ? (
                            <div className="profile-edit-form">
                                <textarea
                                    value={editBio}
                                    onChange={e => setEditBio(e.target.value)}
                                    maxLength={300}
                                    rows={3}
                                    placeholder="Tell other travellers about yourself…"
                                    autoFocus
                                />
                                <div className="pf-bio-actions">
                                    <span className="muted small">{editBio.length}/300</span>
                                    <button type="button" className="pf-btn pf-btn--ghost" onClick={() => setEditingBio(false)}>Cancel</button>
                                    <button type="button" className="pf-btn" disabled={savingBio} onClick={handleSaveBio}>
                                        {savingBio ? 'Saving…' : 'Save bio'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {profile.bio
                                    ? <p className="pf-bio-text">{profile.bio}</p>
                                    : <p className="pf-bio-text pf-bio-text--empty">No bio yet. Tell people what you are about.</p>}
                                <button type="button" className="pf-link" onClick={() => { setEditBio(profile.bio ?? ''); setEditingBio(true); }}>
                                    <Icon name="pencil" size={14} /> {profile.bio ? 'Edit bio' : 'Add a bio'}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </Reveal>

            {profile && (
                <>
                    {/* Progress */}
                    <Reveal as="section" className="pf-progress" variant="up">
                        <div className="pf-xp">
                            <p className="pf-xp-n"><CountUp value={xp} /> <span className="pf-xp-unit">XP</span></p>
                            <p className="pf-xp-note">
                                {r.next ? `${r.toNext.toLocaleString()} XP until ${r.next}` : 'Top rank reached. You are a Voyager.'}
                            </p>
                            <div className="pf-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(r.pct)}>
                                <span style={{ width: `${r.pct}%` }} />
                            </div>
                        </div>

                        <dl className="pf-stats">
                            <div><dt>Global rank</dt><dd>{leaderboardRank !== null ? `#${leaderboardRank}` : 'Unranked'}</dd></div>
                            <div><dt>Quests completed</dt><dd><CountUp value={history.length} /></dd></div>
                            <div><dt>Next rank</dt><dd>{r.next ?? 'None'}</dd></div>
                        </dl>

                        <ol className="pf-ladder" aria-label="Rank ladder">
                            {RANKS.map((rk, i) => (
                                <li key={rk.name} className={i < r.index ? 'is-done' : i === r.index ? 'is-now' : ''}>
                                    <span className="pf-ladder-dot">{i < r.index ? <Icon name="check" size={12} weight="bold" /> : i + 1}</span>
                                    <b>{rk.name}</b>
                                    <em>{rk.xp.toLocaleString()}</em>
                                </li>
                            ))}
                        </ol>
                    </Reveal>

                    {/* Trophy cards */}
                    <section className="pf-section">
                        <div className="qb-section-head">
                            <h2>Completed quests</h2>
                            <span>{history.length} completed</span>
                        </div>

                        {history.length > 0 && (
                            <div className="pf-suits">
                                {bySuit.map(b => (
                                    <div key={b.suit} className={`pf-suit suit-${b.suit}`}>
                                        <span className="pf-suit-pip">{SUITS[b.suit].pip}</span>
                                        <b>{b.count}</b>
                                        <em>{SUITS[b.suit].category}, {b.xp.toLocaleString()} XP</em>
                                    </div>
                                ))}
                            </div>
                        )}

                        {history.length > 0 ? (
                            <Reveal as="div" className="pf-wall" variant="up" stagger>
                                {history.map(h => (
                                    <article key={h._id} className={`pf-trophy suit-${h.cardSuit}`}>
                                        <span className="pf-trophy-corner">{h.cardRank} {SUITS[h.cardSuit].pip}</span>
                                        <span className="pf-trophy-pip" aria-hidden="true">{SUITS[h.cardSuit].pip}</span>
                                        <span className="pf-trophy-xp"><Icon name="lightning" size={12} weight="fill" />+{h.xpEarned} XP</span>
                                        <h3>{h.title}</h3>
                                        <p>{new Date(h.completedAt).toLocaleDateString()}</p>
                                    </article>
                                ))}
                            </Reveal>
                        ) : (
                            <div className="qb-emptycard">
                                <Icon name="cards" size={34} />
                                <h3>No quests completed yet</h3>
                                <p>Your first one is worth up to 1,500 XP.</p>
                                <Link to="/sidequests" className="qb-btn qb-btn--solid"><Icon name="cards" size={16} /> Draw a card</Link>
                            </div>
                        )}
                    </section>

                    {/* Wishlist */}
                    <Reveal as="section" className="pf-section pf-wish" variant="up">
                        <div className="qb-section-head">
                            <h2>Travel wishlist</h2>
                            <button type="button" className="pf-link" onClick={() => { setEditWishlist(profile.wishlist ?? []); setEditingWishlist(e => !e); }}>
                                <Icon name={editingWishlist ? 'close' : 'pencil'} size={14} /> {editingWishlist ? 'Cancel' : 'Edit'}
                            </button>
                        </div>

                        <ul className="pf-chips">
                            {(editingWishlist ? editWishlist : profile.wishlist).map((place, i) => (
                                <li key={place + i} className="pf-chip">
                                    <Icon name="pin" size={15} /> {place}
                                    {editingWishlist && (
                                        <button type="button" aria-label={`Remove ${place}`} onClick={() => setEditWishlist(prev => prev.filter((_, idx) => idx !== i))}>
                                            <Icon name="close" size={12} />
                                        </button>
                                    )}
                                </li>
                            ))}
                            {!editingWishlist && profile.wishlist.length === 0 && (
                                <li className="pf-chips-empty">No destinations yet. Where do you want to go?</li>
                            )}
                        </ul>

                        {editingWishlist && (
                            <div className="pf-wish-add">
                                <div className="qb-search">
                                    <Icon name="search" size={16} />
                                    <input
                                        placeholder="Add a destination"
                                        value={newWishlistItem}
                                        onChange={e => setNewWishlistItem(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addWishlistItem()}
                                        autoFocus
                                    />
                                    <button type="button" onClick={addWishlistItem} disabled={!newWishlistItem.trim()}>Add</button>
                                </div>
                                <button type="button" className="pf-btn" disabled={savingWishlist} onClick={handleSaveWishlist}>
                                    {savingWishlist ? 'Saving…' : 'Save wishlist'}
                                </button>
                            </div>
                        )}
                    </Reveal>
                </>
            )}
        </div>
    );
}
