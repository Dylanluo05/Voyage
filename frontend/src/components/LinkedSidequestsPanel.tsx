import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PublicSidequest } from '../types';
import { getSidequestsByTrip, unassignClaimFromTrip } from '../api/publicSidequests';
import { useAuth } from '../context/AuthContext';
import { Icon } from './Icon';
import Reveal from './Reveal';
import { SUITS } from './quests/questMeta';

interface Props {
    tripId: string;
}

export default function LinkedSidequestsPanel({ tripId }: Props) {
    const { user } = useAuth();
    const [sidequests, setSidequests] = useState<PublicSidequest[]>([]);
    const [loading, setLoading] = useState(true);
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
        } catch {
            setError('Failed to unlink sidequest');
        } finally {
            setUnlinkingId(null);
        }
    }

    if (loading) return <p className="muted small">Loading sidequests…</p>;

    return (
        <Reveal as="section" className="ls" variant="up">
            <div className="ls-head">
                <div>
                    <h2>Sidequests for this trip</h2>
                    <p className="muted">Dares you plan to do while you are there.</p>
                </div>
                <Link to="/sidequests" className="ls-add">
                    <Icon name="plus" size={15} /> Find more
                </Link>
            </div>
            {error && <p className="error small">{error}</p>}
            {sidequests.length === 0 ? (
                <div className="ls-empty">
                    <Icon name="cards" size={30} />
                    <p>Nothing linked yet. Open a quest you have claimed and use <b>Add to trip</b>.</p>
                </div>
            ) : (
                <div className="ls-grid">
                    {sidequests.map(s => {
                        const done = s.completions.some(c => c.userId === user?.id);
                        return (
                            <article key={s._id} className={`ls-tile suit-${s.cardSuit}${done ? ' is-done' : ''}`}>
                                <span className="ls-corner">{s.cardRank} {SUITS[s.cardSuit].pip}</span>
                                <span className="ls-pip" aria-hidden="true">{SUITS[s.cardSuit].pip}</span>
                                <span className="ls-xp"><Icon name="lightning" size={12} weight="fill" />+{s.xpReward} XP</span>
                                <h3>{s.title}</h3>
                                <p>{done ? 'Completed' : 'In progress'}{s.location ? `, ${s.location}` : ''}</p>
                                <button type="button" className="ls-unlink" disabled={unlinkingId === s._id} onClick={() => onUnlink(s)}>
                                    {unlinkingId === s._id ? '…' : 'Unlink'}
                                </button>
                            </article>
                        );
                    })}
                </div>
            )}
        </Reveal>
    );
}
