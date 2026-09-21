import { searchPhotos } from '../api/photos';

/* Stock photo lookup shared by quest and trip covers. Results are cached in localStorage per key
   ('' = looked up, nothing found). At most two lookups run at once so a page of tiles does not
   spike the API rate limiter. Signed-out visitors get a 401 and simply fall back to generated art. */

const PREFIX = 'stock:';
const inflight = new Map<string, Promise<string | null | undefined>>();
let active = 0;
const waiting: (() => void)[] = [];

/** string = cached url, null = cached miss, undefined = never looked up. */
export function readStock(key: string): string | null | undefined {
  try {
    const v = localStorage.getItem(PREFIX + key);
    if (v === null) return undefined;
    return v === '' ? null : v;
  } catch {
    return undefined;
  }
}

function writeStock(key: string, url: string | null) {
  try {
    localStorage.setItem(PREFIX + key, url ?? '');
  } catch {
    /* storage full or blocked: refetched next time */
  }
}

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

/** Resolves to a url, null (nothing found, cached) or undefined (transient failure, not cached). */
export function fetchStock(key: string, queries: string[]): Promise<string | null | undefined> {
  const cached = readStock(key);
  if (cached !== undefined) return Promise.resolve(cached);
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = (async (): Promise<string | null | undefined> => {
    const release = await slot();
    try {
      for (const q of queries.filter((s) => s && s.trim())) {
        const { urls } = await searchPhotos(q);
        if (urls[0]) {
          writeStock(key, urls[0]);
          return urls[0];
        }
      }
      writeStock(key, null);
      return null;
    } catch {
      return undefined;
    } finally {
      release();
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}
