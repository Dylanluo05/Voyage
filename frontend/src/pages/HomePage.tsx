import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const SPOTLIGHT_QUESTS = [
  { title: 'Catch a sunrise', location: 'Anywhere', xp: 50, difficulty: 'easy' as const },
  { title: 'Pull an all-nighter in a new city', location: 'Any Major City', xp: 200, difficulty: 'hard' as const },
  { title: 'Island hop with no set plan', location: 'Greece / Philippines', xp: 500, difficulty: 'legendary' as const },
  { title: 'Explore a night market', location: 'Asia', xp: 100, difficulty: 'medium' as const },
];

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const revealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) navigate('/trips');
  }, [user]);

  useEffect(() => {
    const els = revealRef.current?.querySelectorAll<HTMLElement>('[data-reveal]');
    if (!els?.length) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target); } }),
      { threshold: 0.12 }
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="landing" ref={revealRef}>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />

        <div className="hero-content">
          <span className="hero-eyebrow">✈️ Built for travelers</span>

          <h1 className="landing-headline">
            <span className="headline-line-1">Plan trips.</span>
            <span className="headline-line-2">Live stories.</span>
          </h1>

          <p className="landing-sub">
            Voyage is the all-in-one travel companion — AI-powered itinerary planning,
            group collaboration, real-time updates, and sidequests that turn trips into adventures.
          </p>

          <div className="landing-cta-row">
            <Link to="/register" className="btn-primary-lg">Start for free</Link>
            <Link to="/login" className="btn-ghost-lg">Sign in</Link>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-value">AI</span>
              <span className="hero-stat-label">Trip planner</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-value">20+</span>
              <span className="hero-stat-label">Sidequests</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-value">Live</span>
              <span className="hero-stat-label">Collaboration</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-value">Free</span>
              <span className="hero-stat-label">To start</span>
            </div>
          </div>
        </div>

        <div className="hero-scroll-cue">
          <div className="hero-scroll-bar" />
        </div>
      </section>

      {/* ── Features ── */}
      <section className="features-section">
        <div className="features-heading" data-reveal>
          <span className="features-label">Why Voyage</span>
          <h2>Everything your trip needs.</h2>
          <p>From planning to memories — one app handles it all.</p>
        </div>

        <div className="features-grid">

          {/* Hero card — Trip Planning */}
          <div className="feature-card feature-card--hero" data-reveal data-delay="1">
            <div className="feature-icon-wrap feature-icon-wrap--teal">🗓️</div>
            <h3>AI Trip Planning</h3>
            <p>
              Chat with VoyageAI to generate full day itineraries, suggest activities,
              plan around your budget, and rebuild days on the fly — all in a conversation.
            </p>
            <span className="feature-pill">Start planning →</span>
          </div>

          {/* Hero card — Sidequests */}
          <div className="feature-card feature-card--hero feature-card--violet" data-reveal data-delay="2">
            <div className="feature-icon-wrap feature-icon-wrap--violet">🎯</div>
            <h3>Public Sidequests</h3>
            <p>
              Browse community challenges tied to real locations. Claim a sidequest,
              complete it during your trip, submit photo proof, and earn XP.
            </p>
            <span className="feature-pill" style={{ color: 'var(--violet)' }}>Explore quests →</span>
          </div>

          <div className="feature-card" data-reveal data-delay="1">
            <div className="feature-icon-wrap feature-icon-wrap--emerald">👥</div>
            <h3>Group Collaboration</h3>
            <p>Invite friends, build itineraries together, vote on activities, and see updates live.</p>
          </div>

          <div className="feature-card feature-card--coral" data-reveal data-delay="2">
            <div className="feature-icon-wrap feature-icon-wrap--coral">🌤️</div>
            <h3>Live Weather</h3>
            <p>Real-time forecasts for your destination so you can plan around the climate.</p>
          </div>

          <div className="feature-card feature-card--gold" data-reveal data-delay="3">
            <div className="feature-icon-wrap feature-icon-wrap--gold">💸</div>
            <h3>Expense Splitting</h3>
            <p>Track shared costs, split bills evenly or custom, and settle up within the app.</p>
          </div>

          <div className="feature-card" data-reveal data-delay="1">
            <div className="feature-icon-wrap feature-icon-wrap--teal">🗺️</div>
            <h3>Interactive Map</h3>
            <p>See all your stops on a map, minimize travel time, and find the best route.</p>
          </div>

          <div className="feature-card feature-card--violet" data-reveal data-delay="2">
            <div className="feature-icon-wrap feature-icon-wrap--violet">🎵</div>
            <h3>Trip Playlist</h3>
            <p>Generate a vibe-matched Spotify playlist and export it straight to your library.</p>
          </div>

          <div className="feature-card feature-card--emerald" data-reveal data-delay="3">
            <div className="feature-icon-wrap feature-icon-wrap--emerald">✈️</div>
            <h3>Flights & Hotels</h3>
            <p>Paste confirmation emails and Voyage extracts your booking details instantly.</p>
          </div>

        </div>
      </section>

      {/* ── How it works ── */}
      <section className="how-section">
        <div className="how-heading" data-reveal>
          <span className="label">Simple by design</span>
          <h2>How Voyage works.</h2>
        </div>
        <div className="how-steps">
          <div className="step-card" data-reveal data-delay="1">
            <div className="step-number step-number--1">1</div>
            <h3>Create your trip</h3>
            <p>Add a destination and dates. Invite friends as collaborators right away.</p>
          </div>
          <div className="step-card" data-reveal data-delay="2">
            <div className="step-number step-number--2">2</div>
            <h3>Plan with AI</h3>
            <p>Chat with VoyageAI to fill your days, get suggestions, and build the itinerary hands-free.</p>
          </div>
          <div className="step-card" data-reveal data-delay="3">
            <div className="step-number step-number--3">3</div>
            <h3>Go & complete sidequests</h3>
            <p>Travel, check off activities, complete public challenges, and build your XP along the way.</p>
          </div>
        </div>
      </section>

      {/* ── Sidequests spotlight ── */}
      <section className="sq-spotlight">
        <div className="sq-spotlight-inner">
          <div className="sq-spotlight-text" data-reveal>
            <span className="sq-spotlight-label">⚡ Sidequests</span>
            <h2>Turn your trip into a challenge.</h2>
            <p>
              Public Sidequests are community-created travel challenges — from catching a sunrise
              to solo-tripping a country where you know no one. Claim one, complete it,
              submit proof, and earn XP on your profile.
            </p>
            <Link to="/register" className="sq-spotlight-cta">
              Start earning XP →
            </Link>
          </div>

          <div className="sq-spotlight-cards" data-reveal data-delay="2">
            {SPOTLIGHT_QUESTS.map(q => (
              <div key={q.title} className="sq-mini-card">
                <div className={`sq-mini-dot sq-mini-dot--${q.difficulty}`} />
                <div className="sq-mini-info">
                  <div className="sq-mini-title">{q.title}</div>
                  <div className="sq-mini-loc">📍 {q.location}</div>
                </div>
                <span className="sq-mini-xp">+{q.xp} XP</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="landing-bottom-cta">
        <h2 data-reveal>Ready to explore?</h2>
        <p data-reveal data-delay="1">
          Free to start. No credit card needed. Your next adventure is one trip away.
        </p>
        <div className="landing-cta-row" data-reveal data-delay="2">
          <Link to="/register" className="btn-primary-lg">Create your first trip</Link>
          <Link to="/discover" className="btn-ghost-lg">Browse itineraries</Link>
        </div>
      </section>

    </div>
  );
}
