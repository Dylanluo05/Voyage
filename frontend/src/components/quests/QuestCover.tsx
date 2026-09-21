import type { ReactNode } from 'react';
import type { PublicSidequest } from '../../types';
import { SUITS } from './questMeta';
import { useQuestCover } from './useQuestCover';

type Props = {
  quest: PublicSidequest;
  userId?: string;
  className?: string;
  /** Overlays (corner chips, stamps) rendered on top of the image. */
  children?: ReactNode;
};

/** Big image for a quest: a real photo when there is one, otherwise bold suit-coloured art. */
export default function QuestCover({ quest, userId, className = '', children }: Props) {
  const url = useQuestCover(quest, userId);
  return (
    <div className={`qc suit-${quest.cardSuit} ${className}`}>
      {url ? (
        <img className="qc-img" src={url} alt="" loading="lazy" draggable={false} />
      ) : (
        <div className="qc-art" aria-hidden="true">
          <span className="qc-art-pip">{SUITS[quest.cardSuit].pip}</span>
          <span className="qc-art-rank">{quest.cardRank}</span>
        </div>
      )}
      <div className="qc-shade" aria-hidden="true" />
      {children}
    </div>
  );
}
