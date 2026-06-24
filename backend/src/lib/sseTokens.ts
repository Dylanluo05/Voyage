import { randomBytes } from 'crypto';

interface SseToken {
  userId: string;
  tripId: string;
  expiresAt: number;
}

const tokens = new Map<string, SseToken>();

// Prune expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of tokens) {
    if (val.expiresAt < now) tokens.delete(key);
  }
}, 5 * 60 * 1000);

export function createSseToken(userId: string, tripId: string): string {
  const token = randomBytes(32).toString('hex');
  tokens.set(token, { userId, tripId, expiresAt: Date.now() + 30_000 });
  return token;
}

export function consumeSseToken(token: string, tripId: string): string | null {
  const entry = tokens.get(token);
  if (!entry) return null;
  tokens.delete(token); // one-time use
  if (entry.tripId !== tripId || entry.expiresAt < Date.now()) return null;
  return entry.userId;
}
