import type { PublicSidequest } from '../../types';
import { Icon } from '../Icon';
import QuestCover from './QuestCover';
import { SUITS } from './questMeta';

type Props = {
  quest: PublicSidequest;
  userId?: string;
  /** Layout size in the mosaic: sets the cover height. */
  size: 'lg' | 'md' | 'sm';
  claiming: boolean;
  onOpen: (q: PublicSidequest) => void;
  onClaim: (q: PublicSidequest) => void;
  onProve: (q: PublicSidequest) => void;
};

function initial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || '?';
}

export default function QuestTile({ quest, userId, size, claiming, onOpen, onClaim, onProve }: Props) {
  const claimed = !!userId && quest.claims.some((c) => c.userId === userId);
  const done = !!userId && quest.completions.some((c) => c.userId === userId);
  const suit = SUITS[quest.cardSuit];
  const doers = quest.completions.slice(0, 4);

  return (
    <article className={`qt qt--${size} suit-${quest.cardSuit}${done ? ' is-done' : ''}`}>
      <button type="button" className="qt-cover-btn" onClick={() => onOpen(quest)} aria-label={`Open quest: ${quest.title}`}>
        <QuestCover quest={quest} userId={userId} className="qt-cover">
          <span className="qt-corner">
            <b>{quest.cardRank}</b>
            <i>{suit.pip}</i>
          </span>
          <span className="qt-xp">
            <Icon name="lightning" size={13} weight="fill" />+{quest.xpReward} XP
          </span>

          {done && (
            <span className="qt-stamp" aria-hidden="true">
              <Icon name="check" size={18} weight="bold" /> Completed
            </span>
          )}
          {claimed && !done && <span className="qt-status">In progress</span>}
          {quest.event && (
            <span className="qt-event">
              <Icon name="calendar" size={13} />
              {new Date(quest.event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          <span className="qt-view">
            View quest <Icon name="arrowUpRight" size={14} />
          </span>
        </QuestCover>
      </button>

      <div className="qt-body">
        <div className="qt-heading">
          <h3 className="qt-title">{quest.title}</h3>
          <p className="qt-meta">
            {quest.location && (
              <span>
                <Icon name="pin" size={13} /> {quest.location}
              </span>
            )}
            <span>{suit.name}: {suit.category}</span>
          </p>
        </div>

        <div className="qt-foot">
          <div className="qt-doers" title={`${quest.completions.length} completed`}>
            {doers.map((c) => (
              <span key={c.userId} className="qt-avatar">{initial(c.userName)}</span>
            ))}
            <span className="qt-doers-n">
              {quest.completions.length === 0
                ? 'Be the first'
                : `${quest.completions.length} completed`}
            </span>
          </div>

          {done ? (
            <span className="qt-done-label">
              <Icon name="trophy" size={15} weight="fill" /> Quest complete
            </span>
          ) : claimed ? (
            <button type="button" className="qt-btn qt-btn--go" onClick={() => onProve(quest)}>
              <Icon name="camera" size={15} /> Submit proof
            </button>
          ) : (
            <button type="button" className="qt-btn" disabled={claiming} onClick={() => onClaim(quest)}>
              {claiming ? 'Claiming…' : (
                <>
                  <Icon name="flag" size={15} /> Claim
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
