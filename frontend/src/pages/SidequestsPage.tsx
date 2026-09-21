import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { PublicSidequest, Trip, UserProfile } from '../types';
import * as tripsApi from '../api/trips';
import * as usersApi from '../api/users';
import * as sidequestsApi from '../api/publicSidequests';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { rankFor } from '../utils/ranks';
import Reveal from '../components/Reveal';
import { Icon } from '../components/Icon';
import PlayerHud from '../components/quests/PlayerHud';
import QuestTile from '../components/quests/QuestTile';
import QuestSheet, { type QuestActions } from '../components/quests/QuestSheet';
import { ClaimOverlay, CompleteOverlay, CreateQuestModal, DrawOverlay, type NewQuest } from '../components/quests/QuestOverlays';
import { RANK_ORDER, SUIT_ORDER, SUITS, type Rank, type Suit } from '../components/quests/questMeta';

type Mode = 'board' | 'mine';
type Complete = { quest: PublicSidequest; photoUrl: string; xpGain: number; before: number; after: number };

/** Mosaic rhythm: each row fills 12 columns (7+5, 5+7, 4+4+4), like an editorial grid. */
const MOSAIC: ('lg' | 'md' | 'sm')[] = ['lg', 'md', 'md', 'lg', 'sm', 'sm', 'sm'];

function msg(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export default function SidequestsPage() {
  const { user } = useAuth();
  const uid = user?.id;

  const [quests, setQuests] = useState<PublicSidequest[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [mode, setMode] = useState<Mode>('board');
  const [suit, setSuit] = useState<Suit | 'all'>('all');
  const [rank, setRank] = useState<Rank | 'all'>('all');
  const [query, setQuery] = useState('');

  const [sheetId, setSheetId] = useState<string | null>(null);
  const [sheetProving, setSheetProving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimedQuest, setClaimedQuest] = useState<PublicSidequest | null>(null);
  const [drawn, setDrawn] = useState<PublicSidequest | null>(null);
  const [completed, setCompleted] = useState<Complete | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [sq, tr, pr] = await Promise.all([
          sidequestsApi.listPublicSidequests(),
          tripsApi.listTrips().catch(() => [] as Trip[]),
          usersApi.getProfile().catch(() => null),
        ]);
        setQuests(sq);
        setTrips(tr);
        setProfile(pr);
      } catch (err) {
        setError(msg(err, 'Failed to load sidequests'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const replace = (updated: PublicSidequest) => setQuests((prev) => prev.map((q) => (q._id === updated._id ? updated : q)));

  const isClaimed = (q: PublicSidequest) => !!uid && q.claims.some((c) => c.userId === uid);
  const isDone = (q: PublicSidequest) => !!uid && q.completions.some((c) => c.userId === uid);

  const mine = useMemo(() => quests.filter(isClaimed), [quests, uid]); // eslint-disable-line react-hooks/exhaustive-deps
  const inProgress = mine.filter((q) => !isDone(q));
  const finished = mine.filter(isDone);

  const suitCounts = useMemo(() => {
    const c: Record<Suit, number> = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 };
    quests.forEach((q) => (c[q.cardSuit] += 1));
    return c;
  }, [quests]);

  const board = quests.filter((q) => (suit === 'all' || q.cardSuit === suit) && (rank === 'all' || q.cardRank === rank));

  // ── actions (throwing versions feed the sheet, which shows the error inline) ──
  const actions: QuestActions = {
    claim: async (id) => {
      const updated = await sidequestsApi.claimPublicSidequest(id);
      replace(updated);
      setClaimedQuest(updated);
      setSheetId(null);
    },
    unclaim: async (id) => replace(await sidequestsApi.unclaimPublicSidequest(id)),
    complete: async (id, photoUrl, isPublic) => {
      const updated = await sidequestsApi.completePublicSidequest(id, photoUrl, isPublic);
      replace(updated);
      const before = profile?.xp ?? 0;
      const after = before + updated.xpReward;
      setProfile((p) => (p ? { ...p, xp: after } : p));
      setSheetId(null);
      setCompleted({ quest: updated, photoUrl, xpGain: updated.xpReward, before, after });
      usersApi.getProfile().then(setProfile).catch(() => undefined); // settle on the server's number
    },
    createEvent: async (id, date, max) =>
      replace(await sidequestsApi.createEvent(id, { date, ...(max ? { maxParticipants: max } : {}) })),
    enroll: async (id) => replace(await sidequestsApi.enrollInSidequest(id)),
    leave: async (id) => replace(await sidequestsApi.leaveEvent(id)),
    addComment: async (id, text) => replace(await sidequestsApi.addComment(id, text)),
    removeComment: async (id, commentId) => replace(await sidequestsApi.removeComment(id, commentId)),
    addToTrip: async (id, tripId) => replace(await sidequestsApi.assignClaimToTrip(id, tripId)),
    unlinkTrip: async (id) => replace(await sidequestsApi.unassignClaimFromTrip(id)),
  };

  /** Claim straight from a tile or the draw screen (errors go to the page banner). */
  async function quickClaim(q: PublicSidequest, fromDraw = false) {
    if (!user) {
      setError('Sign in to claim quests.');
      return;
    }
    setClaimingId(q._id);
    setError('');
    try {
      const updated = await sidequestsApi.claimPublicSidequest(q._id);
      replace(updated);
      if (fromDraw) setDrawn(null);
      setClaimedQuest(updated);
    } catch (err) {
      setError(msg(err, 'Failed to claim sidequest'));
    } finally {
      setClaimingId(null);
    }
  }

  async function onSearch() {
    setLoading(true);
    try {
      setQuests(await sidequestsApi.listPublicSidequests(query.trim() || undefined));
    } catch (err) {
      setError(msg(err, 'Search failed'));
    } finally {
      setLoading(false);
    }
  }

  function draw(exclude?: string) {
    const pool = quests.filter(
      (q) => !isClaimed(q) && !isDone(q) && q._id !== exclude && (suit === 'all' || q.cardSuit === suit) && (rank === 'all' || q.cardRank === rank),
    );
    if (pool.length === 0) {
      setError('No unclaimed quests match. Clear a filter or create one.');
      return;
    }
    setError('');
    setDrawn(pool[Math.floor(Math.random() * pool.length)]);
  }

  async function createQuest(f: NewQuest) {
    try {
      const created = await sidequestsApi.createPublicSidequest(f);
      setQuests((prev) => [created, ...prev]);
      setCreating(false);
    } catch (err) {
      throw new Error(msg(err, 'Failed to create sidequest'));
    }
  }

  const sheetQuest = sheetId ? quests.find((q) => q._id === sheetId) ?? null : null;
  const openSheet = (q: PublicSidequest, prove = false) => {
    setSheetProving(prove);
    setSheetId(q._id);
  };

  const xp = profile?.xp ?? 0;
  const list = mode === 'mine' ? inProgress : board;

  const renderTiles = (items: PublicSidequest[]) =>
    items.map((q, i) => (
      <QuestTile
        key={q._id}
        quest={q}
        userId={uid}
        size={MOSAIC[i % MOSAIC.length]}
        claiming={claimingId === q._id}
        onOpen={(x) => openSheet(x)}
        onClaim={(x) => quickClaim(x)}
        onProve={(x) => openSheet(x, true)}
      />
    ));

  return (
    <div className="qb">
      {/* ── Hero: giant type, a fanned deck, the player card ── */}
      <header className="qb-hero">
        <div className="qb-hero-copy">
          <h1 className="qb-title">
            <span>Do it for</span>
            <span>
              the <em className="punch">XP.</em>
            </span>
          </h1>
          <p className="qb-lede">Community dares tied to real places. Claim one, prove it with a photo, and climb the ranks.</p>

          <div className="qb-cta">
            <button type="button" className="qb-btn qb-btn--solid" onClick={() => draw()} disabled={loading || quests.length === 0}>
              <Icon name="cards" size={17} /> Draw a card
            </button>
            {user && (
              <button type="button" className="qb-btn qb-btn--outline" onClick={() => setCreating(true)}>
                <Icon name="plus" size={16} /> Create a quest
              </button>
            )}
            <Link to="/how-to-play" className="qb-textlink">
              How to play <Icon name="arrowRight" size={14} />
            </Link>
          </div>

          {user && (
            <PlayerHud name={user.name} avatarUrl={profile?.avatarUrl} xp={xp} completed={finished.length} active={inProgress.length} />
          )}
        </div>

        <div className="qb-deck" aria-hidden="true">
          {(['spades', 'hearts', 'diamonds', 'clubs'] as Suit[]).map((s, i) => (
            <div key={s} className={`qb-deckcard suit-${s} d${i}`}>
              <span className="qb-deckcard-corner">
                <b>{(['K', 'Q', 'A', 'J'] as const)[i]}</b>
                <i>{SUITS[s].pip}</i>
              </span>
              <span className="qb-deckcard-pip">{SUITS[s].pip}</span>
              <span className="qb-deckcard-xp">+{[1125, 500, 1200, 275][i]} XP</span>
            </div>
          ))}
        </div>
      </header>

      {/* ── Mode, search, suits, difficulty ── */}
      <div className="qb-bar">
        {user ? (
          <div className="qb-seg" role="tablist" aria-label="Quest views">
            <button type="button" role="tab" aria-selected={mode === 'board'} className="qb-seg-btn" onClick={() => setMode('board')}>
              Quest board
            </button>
            <button type="button" role="tab" aria-selected={mode === 'mine'} className="qb-seg-btn" onClick={() => setMode('mine')}>
              My quests {mine.length > 0 && <span className="qb-seg-n">{mine.length}</span>}
            </button>
          </div>
        ) : (
          <span />
        )}
        <div className="qb-search">
          <Icon name="search" size={16} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            placeholder="Search by location"
            aria-label="Search by location"
          />
          <button type="button" onClick={onSearch}>
            Search
          </button>
        </div>
      </div>

      {mode === 'board' && (
        <>
          <div className="qb-suits" role="group" aria-label="Filter by suit">
            <button type="button" className={`qb-suit qb-suit--all${suit === 'all' ? ' is-on' : ''}`} onClick={() => setSuit('all')}>
              <span className="qb-suit-pip">
                <Icon name="cards" size={22} />
              </span>
              <span className="qb-suit-text">
                <b>All quests</b>
                <em>{quests.length} open</em>
              </span>
            </button>
            {SUIT_ORDER.map((s) => (
              <button key={s} type="button" className={`qb-suit suit-${s}${suit === s ? ' is-on' : ''}`} onClick={() => setSuit(suit === s ? 'all' : s)}>
                <span className="qb-suit-pip">{SUITS[s].pip}</span>
                <span className="qb-suit-text">
                  <b>{SUITS[s].name}</b>
                  <em>
                    {SUITS[s].category} · {suitCounts[s]}
                  </em>
                </span>
              </button>
            ))}
          </div>

          <div className="qb-ranks" role="group" aria-label="Filter by difficulty">
            <span>Difficulty</span>
            <button type="button" className={`qb-rank${rank === 'all' ? ' is-on' : ''}`} onClick={() => setRank('all')}>
              Any
            </button>
            {RANK_ORDER.map((r) => (
              <button key={r} type="button" className={`qb-rank${rank === r ? ' is-on' : ''}`} onClick={() => setRank(rank === r ? 'all' : r)}>
                {r}
              </button>
            ))}
          </div>
        </>
      )}

      {error && (
        <p className="error qb-error" role="alert">
          {error}
        </p>
      )}
      {loading && <p className="muted qb-empty">Loading quests…</p>}

      {/* ── Board / In progress ── */}
      {!loading && (
        <>
          {mode === 'mine' && (
            <div className="qb-section-head">
              <h2>In progress</h2>
              <span>{inProgress.length} active</span>
            </div>
          )}

          {list.length > 0 ? (
            <Reveal as="div" className="qb-mosaic" variant="up" stagger>
              {renderTiles(list)}
            </Reveal>
          ) : mode === 'mine' && finished.length > 0 ? (
            <div className="qb-emptyrow">
              <p>Nothing in progress. Ready for the next dare?</p>
              <button type="button" className="qb-btn qb-btn--solid" onClick={() => draw()}>
                <Icon name="cards" size={16} /> Draw a card
              </button>
            </div>
          ) : (
            <div className="qb-emptycard">
              <Icon name="cards" size={34} />
              <h3>{mode === 'mine' ? 'No active quests' : 'Nothing matches'}</h3>
              <p>{mode === 'mine' ? 'Draw a card and take on your first dare.' : 'Try another suit or difficulty.'}</p>
              <button type="button" className="qb-btn qb-btn--solid" onClick={() => draw()}>
                <Icon name="cards" size={16} /> Draw a card
              </button>
            </div>
          )}

          {/* ── Trophy wall ── */}
          {mode === 'mine' && finished.length > 0 && (
            <section className="qb-trophies">
              <div className="qb-section-head">
                <h2>Trophy wall</h2>
                <span>
                  {finished.length} completed · {finished.reduce((s, q) => s + q.xpReward, 0).toLocaleString()} XP earned
                </span>
              </div>
              <Reveal as="div" className="qb-wall" variant="up" stagger>
                {finished.map((q) => {
                  const proof = q.completions.find((c) => c.userId === uid);
                  return (
                    <button key={q._id} type="button" className={`qb-polaroid suit-${q.cardSuit}`} onClick={() => openSheet(q)}>
                      <span className="qb-polaroid-img">
                        {proof && <img src={proof.photoUrl} alt={`Proof for ${q.title}`} loading="lazy" />}
                        <span className="qb-polaroid-xp">+{q.xpReward} XP</span>
                      </span>
                      <span className="qb-polaroid-cap">
                        <b>{q.title}</b>
                        <em>
                          {q.cardRank} {SUITS[q.cardSuit].pip}
                          {proof ? ` · ${new Date(proof.completedAt).toLocaleDateString()}` : ''}
                        </em>
                      </span>
                    </button>
                  );
                })}
              </Reveal>
            </section>
          )}
        </>
      )}

      {/* ── Overlays ── */}
      {sheetQuest && (
        <QuestSheet
          key={sheetQuest._id}
          quest={sheetQuest}
          user={user ? { id: user.id, name: user.name } : null}
          trips={trips}
          actions={actions}
          startProving={sheetProving}
          onClose={() => setSheetId(null)}
          onOpenPhoto={setLightbox}
        />
      )}

      {creating && <CreateQuestModal onClose={() => setCreating(false)} onCreate={createQuest} />}

      {drawn && (
        <DrawOverlay
          quest={drawn}
          userId={uid}
          claiming={claimingId === drawn._id}
          onAccept={() => quickClaim(drawn, true)}
          onAgain={() => draw(drawn._id)}
          onOpen={() => {
            const q = drawn;
            setDrawn(null);
            openSheet(q);
          }}
          onClose={() => setDrawn(null)}
        />
      )}

      {claimedQuest && (
        <ClaimOverlay
          quest={claimedQuest}
          userId={uid}
          onClose={() => setClaimedQuest(null)}
          onOpen={() => {
            const q = claimedQuest;
            setClaimedQuest(null);
            openSheet(q, true);
          }}
        />
      )}

      {completed && (
        <CompleteOverlay
          quest={completed.quest}
          photoUrl={completed.photoUrl}
          xpGain={completed.xpGain}
          before={rankFor(completed.before)}
          after={rankFor(completed.after)}
          onClose={() => setCompleted(null)}
        />
      )}

      {lightbox &&
        createPortal(
          <div className="sq-lightbox-overlay" onClick={() => setLightbox(null)}>
            <div className="sq-lightbox-content" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="sq-lightbox-close" onClick={() => setLightbox(null)}>
                <Icon name="close" size={16} />
              </button>
              <img src={lightbox} alt="Completion proof" className="sq-lightbox-img" />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
