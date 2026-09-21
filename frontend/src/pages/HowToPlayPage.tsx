import { Link } from 'react-router-dom';
import Reveal from '../components/Reveal';
import { Icon } from '../components/Icon';
import DeckFan from '../components/quests/DeckFan';
import { RANK_LABEL, RANK_ORDER, SUIT_ORDER, SUITS, xpFor } from '../components/quests/questMeta';
import { RANKS } from '../utils/ranks';

const STEPS = [
  { title: 'Browse', body: 'Explore dares posted by the Voyage community. Filter by suit to find the kind of challenge that fits your trip.' },
  { title: 'Claim', body: 'Lock one in. It commits you to finishing it. Think of it as drawing the card.' },
  { title: 'Complete', body: 'Do the thing and submit a photo as proof. Our AI judge checks that it matches the quest.' },
  { title: 'Earn XP', body: 'Pass the check and the XP is yours. It stacks on your profile and moves you up the leaderboard.' },
];

const SUIT_DESC = {
  spades: 'Endurance, movement and outdoor challenges that test your body.',
  hearts: 'Connection, conversation and dares that put you among people.',
  diamonds: 'Knowledge, creativity and strategy that push your mind.',
  clubs: 'Coordination, leadership and challenges built for groups.',
} as const;

export default function HowToPlayPage() {
  return (
    <div className="qb hp">
      <header className="qb-hero">
        <div className="qb-hero-copy">
          <h1 className="qb-title">
            <span>How to</span>
            <span><em className="punch">play.</em></span>
          </h1>
          <p className="qb-lede">
            Community dares tied to real places, scored like a deck of cards. Claim one, prove it with a photo, and climb the ranks.
          </p>
          <div className="qb-cta">
            <Link to="/sidequests" className="qb-btn qb-btn--solid">
              <Icon name="cards" size={17} /> Draw a card
            </Link>
            <Link to="/leaderboard" className="qb-textlink">
              See the leaderboard <Icon name="arrowRight" size={14} />
            </Link>
          </div>
        </div>
        <DeckFan />
      </header>

      {/* Four steps */}
      <section className="hp-section">
        <div className="qb-section-head"><h2>Four steps</h2></div>
        <Reveal as="ol" className="hp-steps" variant="up" stagger>
          {STEPS.map((s, i) => (
            <li key={s.title} className="hp-step">
              <span className="hp-step-n">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </Reveal>
      </section>

      {/* Suits */}
      <section className="hp-section">
        <div className="qb-section-head">
          <h2>Suits</h2>
          <span>What kind of challenge</span>
        </div>
        <Reveal as="div" className="hp-suits" variant="up" stagger>
          {SUIT_ORDER.map((s) => (
            <article key={s} className={`hp-suit suit-${s}`}>
              <span className="hp-suit-pip" aria-hidden="true">{SUITS[s].pip}</span>
              <span className="hp-suit-corner">{SUITS[s].pip}</span>
              <h3>{SUITS[s].name}</h3>
              <b>{SUITS[s].category}</b>
              <p>{SUIT_DESC[s]}</p>
            </article>
          ))}
        </Reveal>
      </section>

      {/* Ranks + XP */}
      <section className="hp-section">
        <div className="qb-section-head">
          <h2>Ranks and XP</h2>
          <span>Rank sets the base, suit sets the multiplier</span>
        </div>
        <Reveal as="div" className="hp-xp" variant="up">
          <div className="hp-xp-row hp-xp-row--head">
            <span />
            {SUIT_ORDER.map((s) => (
              <span key={s} className={`hp-xp-suit suit-${s}`}>{SUITS[s].pip} {SUITS[s].name}</span>
            ))}
          </div>
          {RANK_ORDER.map((r) => (
            <div key={r} className="hp-xp-row">
              <span className="hp-xp-rank">
                <b>{r}</b>
                <em>{RANK_LABEL[r]}</em>
              </span>
              {SUIT_ORDER.map((s) => {
                const xp = xpFor(s, r);
                return (
                  <span key={s} className={`hp-xp-cell${xp === 1500 ? ' is-top' : ''}`}>
                    {xp.toLocaleString()}
                    {xp === 1500 && <small>Top card</small>}
                  </span>
                );
              })}
            </div>
          ))}
        </Reveal>
        <p className="hp-note">Spades carry the highest multiplier, so the Ace of Spades is the most valuable card in the deck.</p>
      </section>

      {/* Events */}
      <section className="hp-section">
        <Reveal as="div" className="hp-events" variant="up">
          <span className="hp-events-ico"><Icon name="calendar" size={26} /></span>
          <div>
            <h2>Group events</h2>
            <p>
              Some quests have a set date and a participant cap. Enrolling in an event also claims the quest, so you are committing to show up.
              You can leave before the date, which unclaims it. A quest you already completed cannot be unclaimed.
            </p>
          </div>
        </Reveal>
      </section>

      {/* Player ranks */}
      <section className="hp-section pf-progress hp-ranks">
        <div className="hp-ranks-head">
          <h2>Player ranks</h2>
          <p>As your XP grows, so does your rank. The leaderboard tracks the top players across all of Voyage.</p>
        </div>
        <ol className="pf-ladder" aria-label="Rank ladder">
          {RANKS.map((rk, i) => (
            <li key={rk.name} className={i === 0 ? 'is-now' : ''}>
              <span className="pf-ladder-dot">{i + 1}</span>
              <b>{rk.name}</b>
              <em>{rk.xp === 0 ? 'Start' : rk.xp.toLocaleString()}</em>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-close hp-cta">
        <h2>Ready to <em className="punch">play?</em></h2>
        <p>Your first quest is worth up to 1,500 XP.</p>
        <div className="hero-actions">
          <Link to="/sidequests" className="btn btn--primary">
            Browse sidequests
            <span className="btn__ico"><Icon name="arrowUpRight" size={15} /></span>
          </Link>
        </div>
      </section>
    </div>
  );
}
