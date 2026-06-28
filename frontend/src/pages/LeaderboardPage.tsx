import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LeaderboardEntry } from '../types';
import { getLeaderboard } from '../api/publicSidequests';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getRankLabel } from '../utils/xp';

export default function LeaderboardPage() {
    const { user } = useAuth();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                setEntries(await getLeaderboard());
            } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Failed to load leaderboard');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const top3 = entries.slice(0, 3);
    const rest  = entries.slice(3);

    const PODIUM_ORDER = [1, 0, 2]; // 2nd left, 1st center, 3rd right

    return (
        <div className="page">
            <div className="lb-hero">
                <h1 className="lb-hero-title">Leaderboard</h1>
                <p className="lb-hero-sub">Top adventurers ranked by XP earned from Sidequests.</p>
            </div>

            {loading && <p className="muted">Loading…</p>}
            {error && <p className="error">{error}</p>}

            {!loading && entries.length === 0 && !error && (
                <p className="muted">No entries yet — <Link to="/sidequests">complete a sidequest</Link> to appear here.</p>
            )}

            {top3.length >= 3 && (
                <div className="lb-podium">
                    {PODIUM_ORDER.map(idx => {
                        const entry = top3[idx];
                        const rank = idx + 1;
                        const isMe = entry._id === user?.id;
                        return (
                            <div key={entry._id} className={`lb-podium-slot lb-podium-rank-${rank}${isMe ? ' lb-podium-me' : ''}`}>
                                <div className="lb-podium-icon">
                                    {rank === 1 ? '👑' : rank === 2 ? '🥈' : '🥉'}
                                </div>
                                <div className={`lb-podium-bar lb-podium-bar-${rank}`}>
                                    <span className="lb-podium-pos">#{rank}</span>
                                </div>
                                <p className="lb-podium-name">{entry.name}{isMe ? ' (You)' : ''}</p>
                                <p className="lb-podium-xp">{entry.xp.toLocaleString()} XP</p>
                                <p className="lb-podium-rank-label">{getRankLabel(entry.xp)}</p>
                            </div>
                        );
                    })}
                </div>
            )}

            {rest.length > 0 && (
                <section className="card lb-list">
                    {rest.map((entry, i) => {
                        const pos = i + 4;
                        const isMe = entry._id === user?.id;
                        return (
                            <div key={entry._id} className={`lb-row${isMe ? ' lb-row--me' : ''}`}>
                                <span className="lb-row-pos">#{pos}</span>
                                <span className="lb-row-name">{entry.name}{isMe ? ' (You)' : ''}</span>
                                <span className="lb-row-rank-label">{getRankLabel(entry.xp)}</span>
                                <span className="lb-row-xp">{entry.xp.toLocaleString()} XP</span>
                            </div>
                        );
                    })}
                </section>
            )}
        </div>
    );
}
