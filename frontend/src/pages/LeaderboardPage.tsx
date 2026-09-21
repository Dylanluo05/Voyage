import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LeaderboardEntry } from '../types';
import { getLeaderboard } from '../api/publicSidequests';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { rankFor } from '../utils/ranks';
import Reveal from '../components/Reveal';
import CountUp from '../components/CountUp';
import { Icon } from '../components/Icon';

const initial = (name: string) => name.trim().slice(0, 1).toUpperCase() || '?';

/** Podium slots left to right: 2nd, 1st, 3rd. */
const PODIUM = [1, 0, 2];
const TIER = ['gold', 'silver', 'bronze'] as const;

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getLeaderboard()
      .then(setEntries)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load leaderboard'))
      .finally(() => setLoading(false));
  }, []);

  const top = entries.slice(0, 3);
  const rest = entries.slice(3);
  const myIndex = entries.findIndex((e) => e._id === user?.id);
  const me = myIndex >= 0 ? entries[myIndex] : null;
  const ahead = myIndex > 0 ? entries[myIndex - 1] : null;
  const maxXp = Math.max(1, entries[0]?.xp ?? 1);

  return (
    <div className="lbp">
      <header className="lbp-hero">
        <h1 className="lbp-title">
          <span>Who is</span>
          <span>
            <em className="punch">winning.</em>
          </span>
        </h1>
        <p className="lbp-lede">Every player, ranked by the XP they have earned from sidequests.</p>
        <Link to="/sidequests" className="qb-btn qb-btn--solid lbp-cta">
          <Icon name="cards" size={17} /> Earn some XP
        </Link>
      </header>

      {user && me && (
        <div className="lbp-me">
          <span className="lbp-me-pos">#{myIndex + 1}</span>
          <div>
            <p className="lbp-me-name">
              You are {rankFor(me.xp).name}, {me.xp.toLocaleString()} XP
            </p>
            <p className="lbp-me-note">
              {ahead
                ? `${(ahead.xp - me.xp).toLocaleString()} XP behind ${ahead.name} in ${myIndex}${myIndex === 1 ? 'st' : myIndex === 2 ? 'nd' : myIndex === 3 ? 'rd' : 'th'} place`
                : 'You are in first place. Defend it.'}
            </p>
          </div>
        </div>
      )}

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted qb-empty">Loading the standings…</p>}

      {!loading && entries.length === 0 && !error && (
        <div className="qb-emptycard">
          <Icon name="trophy" size={34} />
          <h3>Nobody is on the board yet</h3>
          <p>Complete a sidequest and the first spot is yours.</p>
          <Link to="/sidequests" className="qb-btn qb-btn--solid">
            <Icon name="cards" size={16} /> Find a sidequest
          </Link>
        </div>
      )}

      {top.length > 0 && (
        <Reveal className={`lbp-podium lbp-podium--${top.length}`} variant="up" stagger>
          {PODIUM.filter((i) => i < top.length).map((i) => {
            const e = top[i];
            const isMe = e._id === user?.id;
            const r = rankFor(e.xp);
            return (
              <article key={e._id} className={`lbp-slot lbp-slot--${TIER[i]}${isMe ? ' is-me' : ''}`}>
                <span className="lbp-slot-medal">
                  <Icon name={i === 0 ? 'crown' : 'medal'} size={i === 0 ? 30 : 24} weight="fill" />
                </span>
                <span className="lbp-slot-place">{i + 1}</span>
                <span className="lbp-avatar lbp-avatar--xl">{initial(e.name)}</span>
                <h2 className="lbp-slot-name">
                  {e.name}
                  {isMe && <small>you</small>}
                </h2>
                <p className="lbp-slot-rank">{r.name}</p>
                <p className="lbp-slot-xp">
                  <CountUp value={e.xp} /> <span className="lbp-xp-unit">XP</span>
                </p>
              </article>
            );
          })}
        </Reveal>
      )}

      {rest.length > 0 && (
        <Reveal as="ol" className="lbp-list" variant="fade" stagger>
          {rest.map((e, i) => {
            const isMe = e._id === user?.id;
            const r = rankFor(e.xp);
            return (
              <li key={e._id} className={`lbp-row${isMe ? ' is-me' : ''}`}>
                <span className="lbp-row-pos">{i + 4}</span>
                <span className="lbp-avatar">{initial(e.name)}</span>
                <span className="lbp-row-who">
                  <b>
                    {e.name}
                    {isMe && <small>you</small>}
                  </b>
                  <em>{r.name}</em>
                </span>
                <span className="lbp-row-bar" aria-hidden="true">
                  <i style={{ width: `${Math.max(3, (e.xp / maxXp) * 100)}%` }} />
                </span>
                <span className="lbp-row-xp">
                  <CountUp value={e.xp} /> XP
                </span>
              </li>
            );
          })}
        </Reveal>
      )}
    </div>
  );
}
