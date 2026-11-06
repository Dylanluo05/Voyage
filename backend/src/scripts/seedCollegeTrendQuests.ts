// Adds trend-driven college sidequests (anywhere) and place-specific ones near the UC campuses,
// UW Seattle, NYU, and Ohio State.
//
//   npx ts-node src/scripts/seedCollegeTrendQuests.ts           # dry run: geocodes and prints, writes nothing
//   npx ts-node src/scripts/seedCollegeTrendQuests.ts --write   # apply
//
// Additive and idempotent: never deletes anything and skips any quest whose title already exists.
// Place coordinates come from OpenStreetMap Nominatim (1 request/second) and every place must land
// within its campus radius or the quest is skipped and reported.
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { User } from '../models/User';
import { PublicSidequest } from '../models/PublicSidequest';
import { TREND_QUESTS, type RankCode, type SuitCode } from './data/collegeTrendQuests';
import { CAMPUSES, PLACES, PLACE_QUESTS } from './data/collegeCampusQuests';
import { inferInterests } from '../lib/interests';

const CREATOR_EMAIL = 'dylan.luo.777@gmail.com';
const write = process.argv.includes('--write');

const SUIT: Record<SuitCode, 'spades' | 'hearts' | 'diamonds' | 'clubs'> = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' };

function computeXp(suit: 'spades' | 'hearts' | 'diamonds' | 'clubs', rank: RankCode): number {
  const BASE_XP = { J: 250, Q: 500, K: 750, A: 1000 };
  const MULTIPLIER = { spades: 1.5, hearts: 1.0, diamonds: 1.2, clubs: 1.1 };
  return Math.round((BASE_XP[rank] * MULTIPLIER[suit]) / 5) * 5;
}

const rad = (d: number) => (d * Math.PI) / 180;
function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

// ── Geocoding (Nominatim usage policy: max 1 request/second) ───────────────────────────────
type Geo = { lat: number; lng: number; address: string } | null;
const cache = new Map<string, Geo>();
let lastCall = 0;

async function geocode(q: string): Promise<Geo> {
  if (cache.has(q)) return cache.get(q)!;
  const wait = lastCall + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  let result: Geo = null;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': 'VoyageTripPlanner-seed-script/1.0' },
    });
    if (res.ok) {
      const rows = (await res.json()) as { lat: string; lon: string; display_name: string }[];
      if (rows[0]) result = { lat: Number(Number(rows[0].lat).toFixed(6)), lng: Number(Number(rows[0].lon).toFixed(6)), address: rows[0].display_name.slice(0, 200) };
    }
  } catch {
    result = null;
  }
  cache.set(q, result);
  return result;
}

type ResolvedPlace = { name: string; address: string; lat: number; lng: number };

async function resolvePlace(key: string): Promise<ResolvedPlace | null> {
  const def = PLACES[key];
  if (!def) {
    console.log(`  ! unknown place key "${key}"`);
    return null;
  }
  const g = await geocode(def.q);
  if (!g) {
    console.log(`  ! could not geocode "${def.q}" (${key})`);
    return null;
  }
  const campus = CAMPUSES[def.campus];
  const distance = km(campus, g);
  const limit = def.maxKm ?? campus.maxKm;
  if (distance > limit) {
    console.log(`  ! ${key} "${def.q}" resolved ${distance.toFixed(0)} km from ${campus.name} (limit ${limit} km): ${g.lat},${g.lng} ${g.address.split(',').slice(0, 2).join(',')}`);
    return null;
  }
  return { name: def.name, address: g.address, lat: g.lat, lng: g.lng };
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  const creator = await User.findOne({ email: CREATOR_EMAIL }).select('_id name');
  if (!creator) {
    console.error(`User ${CREATOR_EMAIL} not found`);
    process.exit(1);
  }
  console.log(write ? '[WRITE MODE]' : '[dry run: nothing will be written]');
  console.log(`Authored: ${TREND_QUESTS.length} anywhere quests + ${PLACE_QUESTS.length} place quests = ${TREND_QUESTS.length + PLACE_QUESTS.length}`);

  // Titles must be unique within this batch and must not collide with existing quests.
  const seen = new Set<string>();
  const batchDupes: string[] = [];
  for (const t of [...TREND_QUESTS.map((q) => q[2]), ...PLACE_QUESTS.map((q) => q[2])]) {
    if (seen.has(t.toLowerCase())) batchDupes.push(t);
    seen.add(t.toLowerCase());
  }
  if (batchDupes.length) console.log('Duplicate titles inside the batch:', batchDupes);

  const existing = new Set((await PublicSidequest.find({}, 'title').lean()).map((q) => q.title.toLowerCase()));

  let created = 0;
  let skippedExisting = 0;
  let skippedPlaces = 0;
  const byRank: Record<string, number> = {};
  const bySuit: Record<string, number> = {};

  async function insert(doc: Record<string, unknown>, suit: SuitCode, rank: RankCode) {
    byRank[rank] = (byRank[rank] ?? 0) + 1;
    bySuit[SUIT[suit]] = (bySuit[SUIT[suit]] ?? 0) + 1;
    if (write) await PublicSidequest.create(doc);
    created++;
  }

  const base = (suit: SuitCode, rank: RankCode) => ({
    cardSuit: SUIT[suit],
    cardRank: rank,
    xpReward: computeXp(SUIT[suit], rank),
    official: true,
    createdBy: { userId: creator._id, userName: creator.name },
    claims: [],
    completions: [],
  });

  console.log('\n== Anywhere quests ==');
  for (const [suit, rank, title, description, location] of TREND_QUESTS) {
    if (existing.has(title.toLowerCase())) { console.log(`  skip "${title}": already exists`); skippedExisting++; continue; }
    await insert({ title, description, location, places: [], interests: inferInterests({ title, description, location, cardSuit: SUIT[suit] }), ...base(suit, rank) }, suit, rank);
  }
  console.log(`  ${write ? 'wrote' : 'would write'} ${created}`);

  console.log('\n== Place quests ==');
  const placeByCampus: Record<string, number> = {};
  for (const [suit, rank, title, description, keys] of PLACE_QUESTS) {
    if (existing.has(title.toLowerCase())) { console.log(`  skip "${title}": already exists`); skippedExisting++; continue; }
    const list = Array.isArray(keys) ? keys : [keys];
    const places: ResolvedPlace[] = [];
    for (const k of list) {
      const p = await resolvePlace(k);
      if (p) places.push(p);
    }
    if (places.length !== list.length) { console.log(`  skip "${title}"`); skippedPlaces++; continue; }
    const campus = CAMPUSES[PLACES[list[0]].campus].name;
    placeByCampus[campus] = (placeByCampus[campus] ?? 0) + 1;
    await insert({ title, description, location: places[0].name, places, interests: inferInterests({ title, description, location: places[0].name, cardSuit: SUIT[suit] }), ...base(suit, rank) }, suit, rank);
  }

  console.log('\nPlace quests per campus:', placeByCampus);
  console.log('By suit:', bySuit, ' By rank:', byRank);
  console.log(`\n${write ? 'Wrote' : 'Would write'}: ${created} quests. Skipped: ${skippedExisting} already exist, ${skippedPlaces} with unresolved places.`);
  if (!write) console.log('Re-run with --write to apply.');
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
