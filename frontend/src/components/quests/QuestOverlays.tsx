import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PublicSidequest } from '../../types';
import type { RankInfo } from '../../utils/ranks';
import CountUp from '../CountUp';
import { Icon } from '../Icon';
import QuestCover from './QuestCover';
import { RANK_ORDER, RANK_LABEL, SUIT_ORDER, SUITS, xpFor, type Rank, type Suit } from './questMeta';

/* Full-screen moments: claiming, drawing a card, completing (the big one), and creating. */

const CONFETTI = ['#e5484d', '#f5a524', '#10b981', '#0b76dd', '#ffffff', '#f472b6'];

function useLock() {
  useEffect(() => {
    document.documentElement.classList.add('sheet-open');
    return () => document.documentElement.classList.remove('sheet-open');
  }, []);
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
}

/** A big playing card showing a quest. */
function BigCard({ quest, userId }: { quest: PublicSidequest; userId?: string }) {
  const suit = SUITS[quest.cardSuit];
  return (
    <div className={`qo-card suit-${quest.cardSuit}`}>
      <QuestCover quest={quest} userId={userId} className="qo-card-cover">
        <span className="qt-corner qt-corner--lg">
          <b>{quest.cardRank}</b>
          <i>{suit.pip}</i>
        </span>
        <span className="qt-xp">
          <Icon name="lightning" size={13} weight="fill" />+{quest.xpReward} XP
        </span>
      </QuestCover>
      <div className="qo-card-body">
        <h3>{quest.title}</h3>
        {quest.location && (
          <p>
            <Icon name="pin" size={13} /> {quest.location}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Claimed ─────────────────────────────────────────────────────────── */

export function ClaimOverlay({
  quest,
  userId,
  onClose,
  onOpen,
}: {
  quest: PublicSidequest;
  userId?: string;
  onClose: () => void;
  onOpen: () => void;
}) {
  useLock();
  useEscape(onClose);
  useEffect(() => {
    const t = window.setTimeout(onClose, 4200);
    return () => window.clearTimeout(t);
  }, [onClose]);

  return createPortal(
    <div className="qo qo--claim" onClick={onClose} role="dialog" aria-modal="true" aria-label="Quest accepted">
      <div className="qo-stage" onClick={(e) => e.stopPropagation()}>
        <p className="qo-kicker">Quest accepted</p>
        <h2 className="qo-headline">
          Now go <em className="punch">do it.</em>
        </h2>
        <div className="qo-deal">
          <BigCard quest={quest} userId={userId} />
        </div>
        <div className="qo-actions">
          <button type="button" className="qo-btn qo-btn--solid" onClick={onOpen}>
            Open quest <Icon name="arrowUpRight" size={15} />
          </button>
          <button type="button" className="qo-btn qo-btn--ghost" onClick={onClose}>
            Keep browsing
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── Draw a card ─────────────────────────────────────────────────────── */

export function DrawOverlay({
  quest,
  userId,
  claiming,
  onAccept,
  onAgain,
  onOpen,
  onClose,
}: {
  quest: PublicSidequest;
  userId?: string;
  claiming: boolean;
  onAccept: () => void;
  onAgain: () => void;
  onOpen: () => void;
  onClose: () => void;
}) {
  useLock();
  useEscape(onClose);
  return createPortal(
    <div className="qo qo--draw" onClick={onClose} role="dialog" aria-modal="true" aria-label="Your card">
      <div className="qo-stage" onClick={(e) => e.stopPropagation()}>
        <p className="qo-kicker">Your card</p>
        <div className="qo-flip" key={quest._id}>
          <div className="qo-flip-inner">
            <div className="qo-flip-back" aria-hidden="true">
              <span>♠</span>
              <span>♥</span>
              <span>♦</span>
              <span>♣</span>
            </div>
            <div className="qo-flip-face">
              <BigCard quest={quest} userId={userId} />
            </div>
          </div>
        </div>
        <div className="qo-actions">
          <button type="button" className="qo-btn qo-btn--solid" disabled={claiming} onClick={onAccept}>
            <Icon name="flag" size={15} /> {claiming ? 'Accepting…' : 'Accept quest'}
          </button>
          <button type="button" className="qo-btn qo-btn--ghost" onClick={onAgain}>
            <Icon name="refresh" size={15} /> Draw again
          </button>
          <button type="button" className="qo-link" onClick={onOpen}>
            See details
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── Completed: the big one ──────────────────────────────────────────── */

export function CompleteOverlay({
  quest,
  photoUrl,
  xpGain,
  before,
  after,
  onClose,
}: {
  quest: PublicSidequest;
  photoUrl: string;
  xpGain: number;
  before: RankInfo;
  after: RankInfo;
  onClose: () => void;
}) {
  useLock();
  useEscape(onClose);
  const rankedUp = after.index > before.index;
  const suit = SUITS[quest.cardSuit];

  // progress bar: fill from the old position; on a rank-up run to 100%, flash the new rank, then restart.
  const [pct, setPct] = useState(before.pct);
  const [banner, setBanner] = useState(false);
  const [instant, setInstant] = useState(false);
  useEffect(() => {
    const timers: number[] = [];
    timers.push(window.setTimeout(() => setPct(rankedUp ? 100 : after.pct), 1700));
    if (rankedUp) {
      timers.push(
        window.setTimeout(() => {
          setBanner(true);
          setInstant(true);
          setPct(0);
        }, 2900),
        window.setTimeout(() => {
          setInstant(false);
          setPct(after.pct);
        }, 3050),
      );
    }
    return () => timers.forEach(window.clearTimeout);
  }, [rankedUp, after.pct]);

  const pieces = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        left: Math.round(Math.random() * 100),
        delay: Math.round(Math.random() * 1800) / 1000,
        dur: 2600 + Math.round(Math.random() * 2400),
        color: CONFETTI[i % CONFETTI.length],
        w: 6 + Math.round(Math.random() * 8),
        h: 10 + Math.round(Math.random() * 12),
        rot: Math.round(Math.random() * 360),
        drift: Math.round((Math.random() - 0.5) * 240),
      })),
    [],
  );

  return createPortal(
    <div className="qo qo--done" role="dialog" aria-modal="true" aria-label="Quest complete">
      <div className="qo-confetti" aria-hidden="true">
        {pieces.map((p, i) => (
          <span
            key={i}
            style={
              {
                left: `${p.left}%`,
                width: p.w,
                height: p.h,
                background: p.color,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.dur}ms`,
                '--rot': `${p.rot}deg`,
                '--drift': `${p.drift}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="qo-stage qo-stage--wide" onClick={(e) => e.stopPropagation()}>
        <p className="qo-kicker">
          {suit.pip} {quest.cardRank} · {suit.name}
        </p>
        <h2 className="qo-mega">
          <span>Quest</span> <span className="qo-mega-2">complete</span>
        </h2>

        <div className="qo-podium">
          <div className={`qo-proof suit-${quest.cardSuit}`}>
            <img className="qo-proof-photo" src={photoUrl} alt="Your proof" />
            <span className="qt-corner qt-corner--lg">
              <b>{quest.cardRank}</b>
              <i>{suit.pip}</i>
            </span>
            <div className="qo-proof-cap">
              <b>{quest.title}</b>
              {quest.location && <span>{quest.location}</span>}
            </div>
          </div>

          <div className="qo-reward">
            <p className="qo-xp">
              <CountUp value={xpGain} prefix="+" /> <span className="qo-xp-unit">XP</span>
            </p>

            <div className="qo-rank">
              <div className="qo-rank-row">
                <span>{banner ? after.name : before.name}</span>
                <span>{banner ? after.next ?? 'Top rank' : before.next ?? 'Top rank'}</span>
              </div>
              <div className="qo-bar">
                <span style={{ width: `${pct}%`, transition: instant ? 'none' : undefined }} />
              </div>
              <p className="qo-rank-note">
                {after.next ? `${after.toNext.toLocaleString()} XP to ${after.next}` : 'You are at the top rank'}
              </p>
            </div>

            {rankedUp && banner && (
              <div className="qo-levelup">
                <Icon name="crown" size={22} weight="fill" />
                <div>
                  <p>Rank up</p>
                  <b>You are now {after.name}</b>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="qo-actions">
          <button type="button" className="qo-btn qo-btn--solid" onClick={onClose}>
            Keep going <Icon name="arrowRight" size={15} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── Create a quest ──────────────────────────────────────────────────── */

export type NewQuest = { title: string; description: string; location: string; cardSuit: Suit; cardRank: Rank };

export function CreateQuestModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (q: NewQuest) => Promise<void>;
}) {
  useLock();
  useEscape(onClose);
  const [form, setForm] = useState<NewQuest>({ title: '', description: '', location: '', cardSuit: 'spades', cardRank: 'J' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const suit = SUITS[form.cardSuit];
  const xp = xpFor(form.cardSuit, form.cardRank);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onCreate(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the quest');
      setSaving(false);
    }
  }

  return createPortal(
    <div className="qs-backdrop" onClick={onClose} data-lenis-prevent>
      <form className="qs qs--create" onSubmit={submit} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Create a quest">
        <button type="button" className="qs-close" onClick={onClose} aria-label="Close">
          <Icon name="close" size={18} />
        </button>

        <div className="qs-media">
          <div className={`qc suit-${form.cardSuit} qs-cover`}>
            <div className="qc-art" aria-hidden="true">
              <span className="qc-art-pip">{suit.pip}</span>
              <span className="qc-art-rank">{form.cardRank}</span>
            </div>
            <div className="qc-shade" aria-hidden="true" />
            <span className="qt-corner qt-corner--lg">
              <b>{form.cardRank}</b>
              <i>{suit.pip}</i>
            </span>
            <span className="qt-xp">
              <Icon name="lightning" size={13} weight="fill" />+{xp} XP
            </span>
            <div className="qs-preview-title">{form.title || 'Your quest title'}</div>
          </div>
        </div>

        <div className="qs-main" data-lenis-prevent>
          <p className="qs-kicker">New quest</p>
          <h2 className="qs-title">Dare someone</h2>

          <div className="qs-form">
            <label>
              Title
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Jump off something tall" required maxLength={120} />
            </label>
            <label>
              What counts as done?
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the challenge and the proof you want" />
            </label>
            <label>
              Where
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Lisbon, Portugal" />
            </label>

            <fieldset className="qs-picker">
              <legend>Suit</legend>
              {SUIT_ORDER.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`qs-pick suit-${s}${form.cardSuit === s ? ' is-on' : ''}`}
                  onClick={() => setForm({ ...form, cardSuit: s })}
                >
                  <b>{SUITS[s].pip}</b> {SUITS[s].category}
                </button>
              ))}
            </fieldset>
            <fieldset className="qs-picker">
              <legend>Difficulty</legend>
              {RANK_ORDER.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`qs-pick${form.cardRank === r ? ' is-on' : ''}`}
                  onClick={() => setForm({ ...form, cardRank: r })}
                >
                  <b>{r}</b> {RANK_LABEL[r]}
                </button>
              ))}
            </fieldset>

            {error && <p className="error">{error}</p>}
            <button type="submit" className="qs-btn qs-btn--go qs-btn--wide" disabled={saving || !form.title.trim()}>
              {saving ? 'Creating…' : `Create quest, worth ${xp} XP`}
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body,
  );
}
