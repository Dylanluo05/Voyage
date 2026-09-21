import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LeaderboardEntry } from '../types';
import { getLeaderboard } from '../api/publicSidequests';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getRankLabel } from '../utils/xp';
import Reveal from '../components/Reveal';
import CountUp from '../components/CountUp';
import { Icon } from '../components/Icon';

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
            <div className="page-head">
                <div className="page-head__lead">
                    <h1 className="lb-hero-title">Leaderboard</h1>
                    <span className="page-head__sub">Top adventurers, ranked by Sidequest XP</span>
                </div>
                <div className="page-head__actions">
                    <Link to="/sidequests" className="btn btn--glass"><Icon name="cards" size={15} /> Sidequests</Link>
                </div>
            </div>

            {loading && <p className="muted">Loading…</p>}
            {error && <p className="error">{error}</p>}

            {!loading && entries.length === 0 && !error && (
                <p className="muted">No entries yet. <Link to="/sidequests">Complete a sidequest</Link> to appear here.</p>
            )}

            {top3.length >= 3 && (
                <Reveal className="lb-podium" variant="up" stagger>
                    {PODIUM_ORDER.map(idx => {
                        const entry = top3[idx];
                        const rank = idx + 1;
                        const isMe = entry._id === user?.id;
                        return (
                            <div key={entry._id} className={`lb-podium-slot lb-podium-rank-${rank}${isMe ? ' lb-podium-me' : ''}`}>
                                <div className="lb-podium-icon" style={{ color: rank === 1 ? 'var(--gold, #eab308)' : 'var(--accent)' }}>
                                    <Icon name={rank === 1 ? 'crown' : 'medal'} size={rank === 1 ? 30 : 24} weight="fill" />
                                </div>
                                <div className={`lb-podium-bar lb-podium-bar-${rank}`}>
                                    <span className="lb-podium-pos">#{rank}</span>
                                </div>
                                <p className="lb-podium-name">{entry.name}{isMe ? ' (You)' : ''}</p>
                                <p className="lb-podium-xp"><CountUp value={entry.xp} suffix=" XP" /></p>
                                <p className="lb-podium-rank-label">{getRankLabel(entry.xp)}</p>
                            </div>
                        );
                    })}
                </Reveal>
            )}

            {rest.length > 0 && (
                <Reveal as="section" className="lb-list" variant="fade" stagger>
                    {rest.map((entry, i) => {
                        const pos = i + 4;
                        const isMe = entry._id === user?.id;
                        return (
                            <div key={entry._id} className={`lb-row${isMe ? ' lb-row--me' : ''}`}>
                                <span className="lb-row-pos">#{pos}</span>
                                <span className="lb-row-name">{entry.name}{isMe ? ' (You)' : ''}</span>
                                <span className="lb-row-rank-label">{getRankLabel(entry.xp)}</span>
                                <span className="lb-row-xp"><CountUp value={entry.xp} suffix=" XP" /></span>
                            </div>
                        );
                    })}
                </Reveal>
            )}
        </div>
    );
}
