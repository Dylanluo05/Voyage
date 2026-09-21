import { Link } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useAuth } from '../context/AuthContext';
import { useReveal } from '../hooks/useReveal';
import { Icon, type IconName } from '../components/Icon';
import SplashHero from '../components/SplashHero';
import FeatureGlobeMount from '../components/FeatureGlobeMount';

type Feature = {
  id: string; icon: IconName; title: string; body: string;
  city: string; lat: number; lng: number;
};

const FEATURES: Feature[] = [
  {
    id: 'plan',
    icon: 'ai',
    title: 'Plan a day in a sentence',
    body: 'Tell the trip assistant what you feel like and it fills the itinerary with real places, sensible timing, notes and photos. Ask again and it rebuilds any day.',
    city: 'Kyoto', lat: 35.01, lng: 135.77,
  },
  {
    id: 'together',
    icon: 'collab',
    title: 'Everyone edits the same trip',
    body: 'Invite the people coming along. Drag activities around, react to ideas, and watch changes land live while you argue about brunch.',
    city: 'Lisbon', lat: 38.72, lng: -9.14,
  },
  {
    id: 'money',
    icon: 'expense',
    title: 'Settle up without the spreadsheet',
    body: 'Log shared costs as they happen, split them evenly or by hand, and see who owes whom before anyone gets home.',
    city: 'Marrakech', lat: 31.63, lng: -7.99,
  },
  {
    id: 'game',
    icon: 'compass',
    title: 'Turn the trip into a game',
    body: 'Claim a community sidequest tied to a real place, like a sunrise hike or a meal you can’t pronounce. Finish it, submit a photo, and bank the XP.',
    city: 'Queenstown', lat: -45.03, lng: 168.66,
  },
  {
    id: 'bookings',
    icon: 'plane',
    title: 'Bookings and playlists, folded in',
    body: 'Paste a confirmation email and the flight or hotel parses itself. Set a vibe and a Spotify playlist for the trip comes with it.',
    city: 'Singapore', lat: 1.35, lng: 103.82,
  },
];

const GLOBE_FEATURES = FEATURES.map((f) => ({ id: f.id, lat: f.lat, lng: f.lng }));

const STEPS = [
  { h: 'Start a trip', p: 'Add a destination and dates. Pull in the people coming with you.' },
  { h: 'Plan it together', p: 'Chat the days into shape, then rearrange by hand until it feels right.' },
  { h: 'Go, and log it', p: 'Check off activities, finish sidequests, and keep the photos as you travel.' },
];

const SPOTLIGHT = [
  { title: 'Sunrise from a summit', suit: 'spades', rank: 'J', pip: '♠', xp: 375 },
  { title: 'Jump off something tall', suit: 'hearts', rank: 'J', pip: '♥', xp: 250 },
  { title: 'A border on foot', suit: 'diamonds', rank: 'A', pip: '♦', xp: 1200 },
  { title: 'A day out for five', suit: 'clubs', rank: 'Q', pip: '♣', xp: 550 },
] as const;

const FAN_OFFSETS = ['-247px', '-82px', '82px', '247px'];
const FAN_ROT = ['-9deg', '-3deg', '3deg', '9deg'];

export default function HomePage() {
  const { user } = useAuth();
  const reveal = useReveal<HTMLDivElement>();

  const [activeFeat, setActiveFeat] = useState(FEATURES[0].id);
  const autoRef = useRef(true);
  const selectFeat = useCallback((id: string) => {
    autoRef.current = false;
    setActiveFeat(id);
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setInterval(() => {
      if (!autoRef.current || document.hidden) return;
      setActiveFeat((cur) => {
        const i = FEATURES.findIndex((f) => f.id === cur);
        return FEATURES[(i + 1) % FEATURES.length].id;
      });
    }, 5200);
    return () => window.clearInterval(t);
  }, []);

  const activeCity = FEATURES.find((f) => f.id === activeFeat)?.city ?? '';

  return (
    <div className="landing" ref={reveal}>
      {/* ── Splash — full-bleed video hero ── */}
      <SplashHero>
        <div className="hero-actions">
          {user ? (
            <>
              <Link to="/trips" className="btn btn--primary">
                Open my trips
                <span className="btn__ico"><Icon name="arrowUpRight" size={15} /></span>
              </Link>
              <Link to="/sidequests" className="btn btn--glass">Browse sidequests</Link>
            </>
          ) : (
            <>
              <Link to="/register" className="btn btn--primary">
                Start a trip
                <span className="btn__ico"><Icon name="arrowUpRight" size={15} /></span>
              </Link>
              <Link to="/discover" className="btn btn--glass">See example itineraries</Link>
            </>
          )}
        </div>
      </SplashHero>

      {/* ── Statement ── */}
      <section className="landing-section wrap landing-statement reveal">
        <p>
          <span className="landing-statement__dim">
            The plan lives in four apps and a group chat. The story lives in a camera roll
            nobody opens.
          </span>{' '}
          Voyage keeps <em className="punch">both</em> in one place.
        </p>
      </section>

      {/* ── Features: interactive globe ── */}
      <section className="landing-section wrap feat-globe" aria-labelledby="feat-h">
        <div className="feat-head reveal">
          <h2 id="feat-h">Five things, one trip.</h2>
        </div>

        <div className="fg-stage reveal">
          <ol className="fg-list">
            {FEATURES.map((f) => {
              const on = f.id === activeFeat;
              return (
                <li key={f.id} className={`fg-item${on ? ' is-on' : ''}`}>
                  <button
                    type="button"
                    className="fg-item-btn"
                    onClick={() => selectFeat(f.id)}
                    aria-expanded={on}
                  >
                    <span className="fg-item-ico"><Icon name={f.icon} size={17} /></span>
                    <span className="fg-item-title">{f.title}</span>
                    <span className="fg-item-city">{f.city}</span>
                  </button>
                  <div className="fg-item-body" aria-hidden={!on}>
                    <p>{f.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="fg-globe-col">
            <FeatureGlobeMount
              features={GLOBE_FEATURES}
              activeId={activeFeat}
              onPick={selectFeat}
            />
            <p className="fg-hint" aria-hidden="true">
              <span>Drag to spin</span>
              <span className="fg-hint-city">{activeCity}</span>
            </p>
          </div>
        </div>
      </section>

      {/* ── How it works: staircase ── */}
      <section className="landing-section wrap">
        <h2 className="how-h reveal">Three moves.</h2>
        <ol className="how">
          {STEPS.map((s, i) => (
            <li
              className="how-step reveal"
              key={s.h}
              style={{ '--i': i, '--reveal-delay': `${i * 0.08}s` } as CSSProperties}
            >
              <h3>{s.h}</h3>
              <p>{s.p}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Sidequests spotlight ── */}
      <section className="landing-section wrap sq">
        <div className="sq-copy reveal">
          <h2>A reason to actually go.</h2>
          <p>
            Community-made challenges tied to real places, scored like a deck of cards. The
            harder the suit and rank, the more XP. Claim one, do it on your trip, submit
            proof, and it lands on your profile.
          </p>
          <Link to="/sidequests" className="btn--quiet">Browse sidequests</Link>
        </div>

        <div className="sq-fan reveal">
          {SPOTLIGHT.map((q, i) => (
            <div
              key={q.title}
              className={`sq-card suit-${q.suit}`}
              style={{ '--tx': FAN_OFFSETS[i], '--rot': FAN_ROT[i] } as CSSProperties}
            >
              <div className="sq-card-top">
                <span>{q.rank}</span>
                <span className="pip">{q.pip}</span>
              </div>
              <div className="sq-card-mid">{q.title}</div>
              <div className="sq-card-foot">
                <span className="sq-card-xp">+{q.xp} XP</span>
                <span className="pip">{q.pip}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Closing ── */}
      <section className="landing-close">
        <h2 className="reveal">
          Go do something <em className="punch">worth retelling.</em>
        </h2>
        <p className="reveal">Free to start. No card needed.</p>
        <div className="hero-actions reveal">
          <Link to={user ? '/trips' : '/register'} className="btn btn--primary">
            {user ? 'Open my trips' : 'Start a trip'}
            <span className="btn__ico"><Icon name="arrowUpRight" size={15} /></span>
          </Link>
        </div>
      </section>
    </div>
  );
}
