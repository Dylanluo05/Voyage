import { useEffect, useState } from 'react';
import type { PublicSidequest } from '../../types';
import { searchPhotos } from '../../api/photos';

/* Cover image for a quest. Priority: the viewer's own proof photo, then any public
   completion photo, then a stock photo found once per quest and cached in localStorage.
   With none of those, the caller falls back to generated suit art. */

const CACHE_PREFIX = 'sq-cover:';
const inflight = new Map<string, Promise<string | null>>();
let active = 0;
const waiting: (() => void)[] = [];

function readCache(id: string): string | null | undefined {
  try {
    const v = localStorage.getItem(CACHE_PREFIX + id);
    if (v === null) return undefined;
    return v === '' ? null : v; // '' = looked up, nothing found
  } catch {
    return undefined;
  }
}

function writeCache(id: string, url: string | null) {
  try {
    localStorage.setItem(CACHE_PREFIX + id, url ?? '');
  } catch {
    /* storage full or blocked: the cover is just refetched next time */
  }
}

/** At most two photo lookups at a time, so a page of quests does not spike the API limiter. */
function slot(): Promise<() => void> {
  return new Promise((resolve) => {
    const go = () => {
      active++;
      resolve(() => {
        active--;
        waiting.shift()?.();
      });
    };
    if (active < 2) go();
    else waiting.push(go);
  });
}

function lookup(q: PublicSidequest): Promise<string | null> {
  const existing = inflight.get(q._id);
  if (existing) return existing;
  const p = (async () => {
    const release = await slot();
    try {
      for (const query of [q.title, q.location].filter((s): s is string => !!s && !!s.trim())) {
        const { urls } = await searchPhotos(query);
        if (urls[0]) return urls[0];
      }
      return null;
    } catch {
      return undefined as unknown as null; // transient failure: do not cache
    } finally {
      release();
    }
  })();
  inflight.set(q._id, p);
  return p;
}

export function useQuestCover(quest: PublicSidequest, userId?: string): string | null {
  const own = userId ? quest.completions.find((c) => c.userId === userId)?.photoUrl : undefined;
  const publicPhoto = quest.completions.find((c) => c.isPublic)?.photoUrl;
  const direct = own ?? publicPhoto ?? null;

  const [stock, setStock] = useState<string | null>(() => (direct ? null : readCache(quest._id) ?? null));

  useEffect(() => {
    if (direct) return;
    const cached = readCache(quest._id);
    if (cached !== undefined) {
      setStock(cached);
      return;
    }
    let live = true;
    lookup(quest).then((url) => {
      if (!live) return;
      if (url === undefined) return; // failed, retry on next mount
      writeCache(quest._id, url);
      setStock(url);
    });
    return () => {
      live = false;
    };
  }, [direct, quest._id, quest.title, quest.location]);

  return direct ?? stock;
}
