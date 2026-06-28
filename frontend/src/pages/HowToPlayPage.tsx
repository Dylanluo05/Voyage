import { Link } from 'react-router-dom';

const SUITS = [
    { symbol: '♠', name: 'Spades', label: 'Physical', color: '#1e293b', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)', desc: 'Endurance, movement, and outdoor challenges that test your body.' },
    { symbol: '♥', name: 'Hearts', label: 'Social', color: '#dc2626', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', desc: 'Connection, conversation, and challenges that put you among people.' },
    { symbol: '♦', name: 'Diamonds', label: 'Intellectual', color: '#1d4ed8', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)', desc: 'Knowledge, creativity, and strategy that push your mind.' },
    { symbol: '♣', name: 'Clubs', label: 'Teamwork', color: '#065f46', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', desc: 'Coordination, leadership, and challenges built for groups.' },
];

const MULTIPLIERS: Record<string, number> = { spades: 1.5, hearts: 1.0, diamonds: 1.2, clubs: 1.1 };
const RANKS = [
    { rank: 'J', label: 'Beginner', base: 250 },
    { rank: 'Q', label: 'Novice', base: 500 },
    { rank: 'K', label: 'Intermediate', base: 750 },
    { rank: 'A', label: 'Advanced', base: 1000 },
];

function computeXp(base: number, multiplier: number): number {
    return Math.round(base * multiplier / 5) * 5;
}

const PLAYER_RANKS = [
    { name: 'Recruit', xp: 0 },
    { name: 'Wanderer', xp: 1000 },
    { name: 'Adventurer', xp: 2000 },
    { name: 'Explorer', xp: 4000 },
    { name: 'Veteran', xp: 7000 },
    { name: 'Champion', xp: 10000 },
    { name: 'Legend', xp: 15000 },
    { name: 'Voyager', xp: 20000 },
];

export default function HowToPlayPage() {
    return (
        <div className="htp-page">
            <div className="htp-orb htp-orb-1" />
            <div className="htp-orb htp-orb-2" />
            <div className="htp-orb htp-orb-3" />

            <div className="htp-card">

                {/* Header */}
                <div className="htp-header">
                    <span className="htp-eyebrow">Voyage Sidequests</span>
                    <h1 className="htp-title">How to Play</h1>
                    <p className="htp-subtitle">Community travel challenges powered by a card-based difficulty system. Complete them. Earn XP. Build your legend.</p>
                </div>

                <div className="htp-divider" />

                {/* How it works */}
                <section className="htp-section">
                    <h2 className="htp-section-title">How It Works</h2>
                    <div className="htp-steps">
                        {[
                            { n: '1', title: 'Browse', body: 'Explore sidequests posted by the Voyage community. Filter by suit to find the type of challenge that fits your trip.' },
                            { n: '2', title: 'Claim', body: 'Lock in a sidequest. This commits you to completing it — think of it as drawing the card.' },
                            { n: '3', title: 'Complete', body: 'Do the challenge and submit a photo as proof. Our AI judge verifies that your photo matches the sidequest.' },
                            { n: '4', title: 'Earn XP', body: 'Pass verification and the XP is yours. It stacks on your profile and moves you up the leaderboard.' },
                        ].map(step => (
                            <div key={step.n} className="htp-step">
                                <div className="htp-step-num">{step.n}</div>
                                <div className="htp-step-body">
                                    <strong className="htp-step-title">{step.title}</strong>
                                    <p className="htp-step-desc">{step.body}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="htp-divider" />

                {/* The Card System */}
                <section className="htp-section">
                    <h2 className="htp-section-title">The Card System</h2>
                    <p className="htp-section-desc">Every sidequest has a <strong>suit</strong> (its category) and a <strong>rank</strong> (its difficulty). Together they determine how much XP you earn.</p>

                    <h3 className="htp-subsection-title">Suits — What Kind of Challenge</h3>
                    <div className="htp-suits-grid">
                        {SUITS.map(s => (
                            <div key={s.name} className="htp-suit-card" style={{ background: s.bg, borderColor: s.border }}>
                                <span className="htp-suit-symbol" style={{ color: s.color }}>{s.symbol}</span>
                                <div className="htp-suit-info">
                                    <span className="htp-suit-name" style={{ color: s.color }}>{s.name}</span>
                                    <span className="htp-suit-label">{s.label}</span>
                                    <p className="htp-suit-desc">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <h3 className="htp-subsection-title">Ranks — How Hard</h3>
                    <div className="htp-ranks-row">
                        {RANKS.map(r => (
                            <div key={r.rank} className="htp-rank-pill">
                                <span className="htp-rank-letter">{r.rank}</span>
                                <span className="htp-rank-label">{r.label}</span>
                            </div>
                        ))}
                    </div>

                    <h3 className="htp-subsection-title">XP Rewards</h3>
                    <p className="htp-section-desc" style={{ marginBottom: 16 }}>Physical (♠ Spades) challenges carry the highest multiplier. The Ace of Spades is the most valuable card in the deck.</p>
                    <div className="htp-xp-table">
                        <div className="htp-xp-table-header">
                            <div />
                            {SUITS.map(s => (
                                <div key={s.name} className="htp-xp-col-head" style={{ color: s.color }}>
                                    {s.symbol} {s.name}
                                </div>
                            ))}
                        </div>
                        {RANKS.map(r => (
                            <div key={r.rank} className="htp-xp-row">
                                <div className="htp-xp-row-head">
                                    <span className="htp-xp-rank">{r.rank}</span>
                                    <span className="htp-xp-rank-label">{r.label}</span>
                                </div>
                                {SUITS.map(s => (
                                    <div key={s.name} className="htp-xp-cell" style={{ borderColor: s.border }}>
                                        {computeXp(r.base, MULTIPLIERS[s.name.toLowerCase()])} XP
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </section>

                <div className="htp-divider" />

                {/* Events */}
                <section className="htp-section">
                    <h2 className="htp-section-title">Events</h2>
                    <p className="htp-section-desc">Some sidequests have a set date and a participant cap. When you enroll in an event, you're automatically claiming the sidequest — you're committing to show up and complete it together with others.</p>
                    <div className="htp-info-box">
                        <span className="htp-info-icon">📅</span>
                        <p>You can leave an event before the date and it will unclaim the sidequest. You cannot unclaim a sidequest you've already completed.</p>
                    </div>
                </section>

                <div className="htp-divider" />

                {/* Player Ranks */}
                <section className="htp-section">
                    <h2 className="htp-section-title">Player Ranks</h2>
                    <p className="htp-section-desc">As your XP grows, so does your rank. The leaderboard tracks the top adventurers across all of Voyage.</p>
                    <div className="htp-player-ranks">
                        {PLAYER_RANKS.map((r, i) => (
                            <div key={r.name} className="htp-player-rank">
                                <span className="htp-player-rank-pos">{i + 1}</span>
                                <span className="htp-player-rank-name">{r.name}</span>
                                <span className="htp-player-rank-xp">{r.xp === 0 ? 'Starting rank' : `${r.xp.toLocaleString()} XP`}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="htp-divider" />

                {/* CTA */}
                <div className="htp-cta">
                    <Link to="/sidequests" className="htp-cta-btn">Browse Sidequests</Link>
                    <Link to="/profile" className="htp-cta-ghost">View Your Profile</Link>
                </div>

            </div>
        </div>
    );
}
