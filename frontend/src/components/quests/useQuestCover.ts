import { useEffect, useState } from 'react';
import type { PublicSidequest } from '../../types';
import { fetchStock, readStock } from '../../utils/stockPhoto';

/* Cover image for a quest. Priority: the viewer's own proof photo, then any public
   completion photo, then a stock photo (cached), then the caller falls back to suit art. */

export function useQuestCover(quest: PublicSidequest, userId?: string): string | null {
  const own = userId ? quest.completions.find((c) => c.userId === userId)?.photoUrl : undefined;
  const publicPhoto = quest.completions.find((c) => c.isPublic)?.photoUrl;
  const direct = own ?? publicPhoto ?? null;
  const key = `quest:${quest._id}`;

  const [stock, setStock] = useState<string | null>(() => (direct ? null : readStock(key) ?? null));

  useEffect(() => {
    if (direct) return;
    let live = true;
    fetchStock(key, [quest.title, quest.location ?? '']).then((url) => {
      if (live && url !== undefined) setStock(url);
    });
    return () => {
      live = false;
    };
  }, [direct, key, quest.title, quest.location]);

  return direct ?? stock;
}
