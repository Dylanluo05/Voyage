import { SUITS, type Suit } from './questMeta';

const CARDS: { suit: Suit; rank: string; xp: number }[] = [
  { suit: 'spades', rank: 'K', xp: 1125 },
  { suit: 'hearts', rank: 'Q', xp: 500 },
  { suit: 'diamonds', rank: 'A', xp: 1200 },
  { suit: 'clubs', rank: 'J', xp: 275 },
];

/** The hero's fanned deck of four oversized suit cards (decorative). */
export default function DeckFan() {
  return (
    <div className="qb-deck" aria-hidden="true">
      {CARDS.map((c, i) => (
        <div key={c.suit} className={`qb-deckcard suit-${c.suit} d${i}`}>
          <span className="qb-deckcard-corner">
            <b>{c.rank}</b>
            <i>{SUITS[c.suit].pip}</i>
          </span>
          <span className="qb-deckcard-pip">{SUITS[c.suit].pip}</span>
          <span className="qb-deckcard-xp">+{c.xp} XP</span>
        </div>
      ))}
    </div>
  );
}
