/** Player ranks, by total XP. Shared by the profile page and the quest board. */
export const RANKS = [
  { name: 'Recruit', xp: 0 },
  { name: 'Wanderer', xp: 1000 },
  { name: 'Adventurer', xp: 2000 },
  { name: 'Explorer', xp: 4000 },
  { name: 'Veteran', xp: 7000 },
  { name: 'Champion', xp: 10000 },
  { name: 'Legend', xp: 15000 },
  { name: 'Voyager', xp: 20000 },
] as const;

export type RankInfo = {
  index: number;
  name: string;
  next: string | null;
  floor: number;
  ceiling: number | null;
  /** 0-100 progress through the current rank (100 at the top rank). */
  pct: number;
  toNext: number;
};

export function rankFor(xp: number): RankInfo {
  let index = 0;
  for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].xp) index = i;
  const floor = RANKS[index].xp;
  const nextRank = RANKS[index + 1];
  const ceiling = nextRank ? nextRank.xp : null;
  const pct = ceiling === null ? 100 : Math.min(100, Math.max(0, ((xp - floor) / (ceiling - floor)) * 100));
  return {
    index,
    name: RANKS[index].name,
    next: nextRank?.name ?? null,
    floor,
    ceiling,
    pct,
    toNext: ceiling === null ? 0 : ceiling - xp,
  };
}
