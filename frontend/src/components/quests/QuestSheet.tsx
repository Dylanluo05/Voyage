import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { PublicSidequest, Trip } from '../../types';
import { uploadToCloudinary } from '../../utils/image';
import { Icon } from '../Icon';
import QuestCover from './QuestCover';
import { RANK_LABEL, SUITS } from './questMeta';

export type QuestActions = {
  claim: (id: string) => Promise<void>;
  unclaim: (id: string) => Promise<void>;
  complete: (id: string, photoUrl: string, isPublic: boolean) => Promise<void>;
  createEvent: (id: string, date: string, max?: number) => Promise<void>;
  enroll: (id: string) => Promise<void>;
  leave: (id: string) => Promise<void>;
  addComment: (id: string, text: string) => Promise<void>;
  removeComment: (id: string, commentId: string) => Promise<void>;
  addToTrip: (id: string, tripId: string) => Promise<void>;
  unlinkTrip: (id: string) => Promise<void>;
};

type Props = {
  quest: PublicSidequest;
  user: { id: string; name: string } | null;
  trips: Trip[];
  actions: QuestActions;
  /** Open with the proof form already showing. */
  startProving: boolean;
  onClose: () => void;
  onOpenPhoto: (url: string) => void;
};

export default function QuestSheet({ quest, user, trips, actions, startProving, onClose, onOpenPhoto }: Props) {
  const userId = user?.id;
  const claim = quest.claims.find((c) => c.userId === userId);
  const claimed = !!claim;
  const myCompletion = quest.completions.find((c) => c.userId === userId);
  const done = !!myCompletion;
  const linkedTrip = claim?.tripId ? trips.find((t) => t._id === claim.tripId) : undefined;
  const suit = SUITS[quest.cardSuit];

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  // proof
  const [proving, setProving] = useState(startProving && claimed && !done);
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const proveRef = useRef<HTMLDivElement>(null);

  // event scheduling, trip linking, comments
  const [scheduling, setScheduling] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [eventMax, setEventMax] = useState('');
  const [linking, setLinking] = useState(false);
  const [tripId, setTripId] = useState(trips[0]?._id ?? '');
  const [comment, setComment] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.documentElement.classList.add('sheet-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.classList.remove('sheet-open');
    };
  }, [onClose]);

  useEffect(() => {
    if (proving) proveRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [proving]);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      setPhotoUrl(await uploadToCloudinary(file));
    } catch {
      setError('Photo upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  const publicPhotos = quest.completions.filter((c) => c.isPublic);

  return createPortal(
    <div className="qs-backdrop" onClick={onClose} data-lenis-prevent>
      <div
        className={`qs suit-${quest.cardSuit}`}
        role="dialog"
        aria-modal="true"
        aria-label={quest.title}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="qs-close" onClick={onClose} aria-label="Close">
          <Icon name="close" size={18} />
        </button>

        <div className="qs-media">
          <QuestCover quest={quest} userId={userId} className="qs-cover">
            <span className="qt-corner qt-corner--lg">
              <b>{quest.cardRank}</b>
              <i>{suit.pip}</i>
            </span>
            {done && (
              <span className="qt-stamp" aria-hidden="true">
                <Icon name="check" size={20} weight="bold" /> Completed
              </span>
            )}
          </QuestCover>
        </div>

        <div className="qs-main" data-lenis-prevent>
          <p className="qs-kicker">
            {suit.pip} {suit.name}: {suit.category} · {quest.cardRank} ({RANK_LABEL[quest.cardRank]})
          </p>
          <h2 className="qs-title">{quest.title}</h2>
          {quest.description && <p className="qs-desc">{quest.description}</p>}

          <ul className="qs-facts">
            <li className="qs-fact qs-fact--xp">
              <Icon name="lightning" size={16} weight="fill" />
              <b>+{quest.xpReward} XP</b> reward
            </li>
            {quest.location && (
              <li className="qs-fact">
                <Icon name="pin" size={16} /> {quest.location}
              </li>
            )}
            <li className="qs-fact">
              <Icon name="user" size={16} /> Created by {quest.createdBy.userName}
            </li>
            <li className="qs-fact">
              <Icon name="trophy" size={16} /> {quest.completions.length} completed
            </li>
          </ul>

          {error && <p className="error">{error}</p>}

          {/* Primary actions */}
          {user && (
            <div className="qs-actions">
              {done ? (
                <span className="qs-done">
                  <Icon name="trophy" size={18} weight="fill" /> You completed this quest
                </span>
              ) : claimed ? (
                <>
                  <button type="button" className="qs-btn qs-btn--go" onClick={() => setProving((p) => !p)}>
                    <Icon name="camera" size={17} /> {proving ? 'Hide proof form' : 'Submit proof'}
                  </button>
                  <button
                    type="button"
                    className="qs-btn qs-btn--ghost"
                    disabled={busy === 'unclaim'}
                    onClick={() => run('unclaim', () => actions.unclaim(quest._id))}
                  >
                    {busy === 'unclaim' ? '…' : 'Unclaim'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="qs-btn qs-btn--go"
                  disabled={busy === 'claim'}
                  onClick={() => run('claim', () => actions.claim(quest._id))}
                >
                  <Icon name="flag" size={17} /> {busy === 'claim' ? 'Claiming…' : 'Claim this quest'}
                </button>
              )}
            </div>
          )}

          {/* Proof */}
          {proving && claimed && !done && (
            <div className="qs-block qs-prove" ref={proveRef}>
              <h3>Prove it</h3>
              <p className="muted">Upload a photo of you doing it. Our judge checks it matches the quest.</p>
              <button type="button" className={`qs-drop${photoUrl ? ' has-photo' : ''}`} onClick={() => fileRef.current?.click()}>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />
                {uploading ? (
                  <span>Uploading…</span>
                ) : photoUrl ? (
                  <img src={photoUrl} alt="Your proof" />
                ) : (
                  <>
                    <Icon name="camera" size={28} />
                    <span>Choose a photo</span>
                  </>
                )}
              </button>
              <label className="qs-check">
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
                <span>Share my photo on the quest page</span>
              </label>
              <button
                type="button"
                className="qs-btn qs-btn--go qs-btn--wide"
                disabled={!photoUrl || uploading || busy === 'complete'}
                onClick={() =>
                  run('complete', async () => {
                    await actions.complete(quest._id, photoUrl, isPublic);
                    setProving(false);
                    setPhotoUrl('');
                  })
                }
              >
                <Icon name="trophy" size={17} /> {busy === 'complete' ? 'Checking your proof…' : `Complete quest, earn ${quest.xpReward} XP`}
              </button>
            </div>
          )}

          {/* Event */}
          {quest.event ? (
            <div className="qs-block">
              <h3>
                <Icon name="calendar" size={17} /> Group event
              </h3>
              <p className="qs-event-date">
                {new Date(quest.event.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
                {quest.event.maxParticipants && (
                  <span> · {quest.event.enrollments.length}/{quest.event.maxParticipants} spots</span>
                )}
              </p>
              {quest.event.enrollments.length > 0 && (
                <ul className="qs-enrolled">
                  {quest.event.enrollments.map((e) => (
                    <li key={e.userId}>{e.userName}</li>
                  ))}
                </ul>
              )}
              {user &&
                (quest.event.enrollments.some((e) => e.userId === userId) ? (
                  <button type="button" className="qs-btn qs-btn--ghost" onClick={() => run('leave', () => actions.leave(quest._id))}>
                    Leave event
                  </button>
                ) : (
                  <button
                    type="button"
                    className="qs-btn qs-btn--go"
                    disabled={busy === 'enroll'}
                    onClick={() => run('enroll', () => actions.enroll(quest._id))}
                  >
                    {busy === 'enroll' ? 'Enrolling…' : 'Join the event'}
                  </button>
                ))}
            </div>
          ) : (
            claimed &&
            !done && (
              <div className="qs-block">
                <h3>
                  <Icon name="calendar" size={17} /> Make it a group event
                </h3>
                {scheduling ? (
                  <div className="qs-form">
                    <label>
                      Date and time
                      <input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                    </label>
                    <label>
                      Max people (optional)
                      <input type="number" min={1} placeholder="Unlimited" value={eventMax} onChange={(e) => setEventMax(e.target.value)} />
                    </label>
                    <div className="qs-row">
                      <button
                        type="button"
                        className="qs-btn qs-btn--go"
                        disabled={!eventDate || busy === 'event'}
                        onClick={() =>
                          run('event', async () => {
                            await actions.createEvent(quest._id, eventDate, eventMax ? Number(eventMax) : undefined);
                            setScheduling(false);
                          })
                        }
                      >
                        Schedule
                      </button>
                      <button type="button" className="qs-btn qs-btn--ghost" onClick={() => setScheduling(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="qs-btn qs-btn--ghost" onClick={() => setScheduling(true)}>
                    Schedule an event
                  </button>
                )}
              </div>
            )
          )}

          {/* Trip link */}
          {claimed && trips.length > 0 && (
            <div className="qs-block">
              <h3>
                <Icon name="suitcase" size={17} /> On a trip
              </h3>
              {linkedTrip && !linking ? (
                <p className="qs-linked">
                  Linked to <Link to={`/trips/${linkedTrip._id}`}>{linkedTrip.title}</Link>
                  <button type="button" className="qs-link" onClick={() => setLinking(true)}>Change</button>
                  <button type="button" className="qs-link" onClick={() => run('unlink', () => actions.unlinkTrip(quest._id))}>Unlink</button>
                </p>
              ) : linking || !linkedTrip ? (
                <div className="qs-row">
                  <select value={tripId} onChange={(e) => setTripId(e.target.value)}>
                    {trips.map((t) => (
                      <option key={t._id} value={t._id}>{t.title}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="qs-btn qs-btn--go"
                    disabled={!tripId || busy === 'link'}
                    onClick={() =>
                      run('link', async () => {
                        await actions.addToTrip(quest._id, tripId);
                        setLinking(false);
                      })
                    }
                  >
                    Add to trip
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {/* Proof gallery */}
          {publicPhotos.length > 0 && (
            <div className="qs-block">
              <h3>
                <Icon name="image" size={17} /> Proof from the crew
              </h3>
              <div className="qs-gallery">
                {publicPhotos.map((c) => (
                  <button key={c.userId} type="button" className="qs-shot" onClick={() => onOpenPhoto(c.photoUrl)}>
                    <img src={c.photoUrl} alt={`${c.userName} completing the quest`} loading="lazy" />
                    <span>{c.userName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="qs-block">
            <h3>
              <Icon name="comment" size={17} /> {quest.comments.length} comment{quest.comments.length === 1 ? '' : 's'}
            </h3>
            {quest.comments.length === 0 && <p className="muted">No comments yet. Say something.</p>}
            <ul className="qs-comments">
              {quest.comments.map((c) => (
                <li key={c._id}>
                  <span className="qt-avatar">{c.userName.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <p>
                      <b>{c.userName}</b> <time>{new Date(c.createdAt).toLocaleDateString()}</time>
                    </p>
                    <p>{c.text}</p>
                  </div>
                  {c.userId === userId && (
                    <button type="button" className="qs-link" onClick={() => run('rm', () => actions.removeComment(quest._id, c._id))}>
                      Delete
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {user && (
              <form
                className="qs-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!comment.trim()) return;
                  run('comment', async () => {
                    await actions.addComment(quest._id, comment.trim());
                    setComment('');
                  });
                }}
              >
                <input type="text" placeholder="Add a comment…" maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />
                <button type="submit" className="qs-btn qs-btn--ghost" disabled={!comment.trim() || busy === 'comment'}>
                  Post
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
