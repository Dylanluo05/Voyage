// Adds place-specific sidequests and pins existing ones to real places.
//
//   npx ts-node src/scripts/seedPlaceQuests.ts           # dry run: geocodes and prints, writes nothing
//   npx ts-node src/scripts/seedPlaceQuests.ts --write   # apply
//
// Additive and idempotent: it never deletes anything, skips quests whose title already exists,
// and only pins existing quests (made by the seed account) that have no places yet.
// Coordinates come from OpenStreetMap Nominatim (free, 1 request/second), so check the dry-run
// output before writing.
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { User } from '../models/User';
import { PublicSidequest } from '../models/PublicSidequest';

const CREATOR_EMAIL = 'dylan.luo.777@gmail.com';
const write = process.argv.includes('--write');

type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
type Rank = 'J' | 'Q' | 'K' | 'A';

/** `name` is what players see; `q` is only used to look up coordinates. */
type PlaceSpec = { name: string; q: string };

function computeXp(suit: Suit, rank: Rank): number {
  const BASE_XP = { J: 250, Q: 500, K: 750, A: 1000 };
  const MULTIPLIER = { spades: 1.5, hearts: 1.0, diamonds: 1.2, clubs: 1.1 };
  return Math.round((BASE_XP[rank] * MULTIPLIER[suit]) / 5) * 5;
}

// ── Existing quests: pin them (matched by exact title) ─────────────────────────────
const PINS: { title: string; location?: string; places: PlaceSpec[] }[] = [
  {
    title: 'Navigate a Foreign City Using Only a Paper Map',
    location: 'Tokyo, Lisbon, Rome and more',
    places: [
      { name: 'Shinjuku, Tokyo', q: 'Shinjuku Station, Tokyo' },
      { name: 'Alfama, Lisbon', q: 'Alfama, Lisbon' },
      { name: 'Centro Storico, Rome', q: 'Piazza Navona, Rome' },
      { name: 'Sultanahmet, Istanbul', q: 'Sultanahmet Square, Istanbul' },
      { name: 'The Medina, Marrakech', q: 'Jemaa el-Fnaa, Marrakech' },
      { name: 'Gion, Kyoto', q: 'Gion, Kyoto' },
      { name: 'Myeongdong, Seoul', q: 'Myeongdong, Seoul' },
    ],
  },
  { title: 'Summit a Peak Before Sunrise', places: [{ name: 'Rocky Mountain National Park', q: 'Rocky Mountain National Park, Colorado' }] },
  { title: 'Organize a Rooftop Sunset Picnic for Strangers', places: [{ name: 'Miradouro da Senhora do Monte, Lisbon', q: 'Miradouro da Senhora do Monte, Lisbon' }] },
  { title: 'Free Solo a Via Ferrata Route', places: [{ name: 'Cortina d’Ampezzo, Dolomites', q: 'Cortina d\'Ampezzo, Italy' }] },
  {
    title: 'Sketch Every Landmark You Visit in One Day',
    places: [
      { name: 'Colosseum, Rome', q: 'Colosseum, Rome' },
      { name: 'Pantheon, Rome', q: 'Pantheon, Rome' },
      { name: 'Trevi Fountain, Rome', q: 'Trevi Fountain, Rome' },
      { name: 'Spanish Steps, Rome', q: 'Spanish Steps, Rome' },
    ],
  },
  { title: 'Plan and Lead a Full-Day Group Itinerary for 5+ People', places: [{ name: 'Plaça de Catalunya, Barcelona', q: 'Plaça de Catalunya, Barcelona' }] },
  { title: 'Swim to an Island', places: [{ name: 'Hvar, Croatia', q: 'Hvar Town, Croatia' }] },
  { title: 'Decode the History of a Place Most Tourists Skip', places: [{ name: 'Chora Church (Kariye), Istanbul', q: 'Chora Church, Istanbul' }] },
  { title: 'Cook a Local Dish from Scratch Using Only Ingredients from a Street Market', places: [{ name: 'Jemaa el-Fnaa, Marrakech', q: 'Jemaa el-Fnaa, Marrakech' }] },
  {
    title: 'Try Every Stall at a Night Market',
    location: 'Taipei, Hong Kong, Marrakech',
    places: [
      { name: 'Shilin Night Market, Taipei', q: 'Shilin Night Market, Taipei' },
      { name: 'Temple Street Night Market, Hong Kong', q: 'Temple Street Night Market, Hong Kong' },
      { name: 'Jemaa el-Fnaa, Marrakech', q: 'Jemaa el-Fnaa, Marrakech' },
    ],
  },
  {
    title: 'Cross a Country Border on Foot',
    location: 'Italy/Slovenia, USA/Canada',
    places: [
      { name: 'Piazza Transalpina, Gorizia (Italy/Slovenia)', q: 'Piazza Transalpina, Gorizia' },
      { name: 'Peace Arch, Blaine WA (USA/Canada)', q: 'Peace Arch State Park, Blaine, Washington' },
    ],
  },
];

// ── New place-specific quests ─────────────────────────────────────────────────────
type NewQuest = { title: string; description: string; location: string; cardSuit: Suit; cardRank: Rank; places: PlaceSpec[] };
const NEW_QUESTS: NewQuest[] = [
  {
    title: 'Play Pickup Soccer Under Tokyo Tower',
    description: 'Grab a ball and get a game going in Shiba Park with Tokyo Tower looming overhead. Wave over nearby kids and runners to join. The proof photo needs the tower in the shot.',
    location: 'Shiba Park, Tokyo',
    cardSuit: 'spades', cardRank: 'Q',
    places: [{ name: 'Tokyo Tower (Shiba Park)', q: 'Tokyo Tower, Minato, Tokyo' }],
  },
  {
    title: 'Climb Through the Fushimi Inari Gates to the Summit',
    description: 'Walk the full trail of thousands of torii gates up Mt. Inari, about 2 to 3 hours round trip. Take your proof photo at the summit shrine.',
    location: 'Fushimi Inari Taisha, Kyoto',
    cardSuit: 'spades', cardRank: 'K',
    places: [{ name: 'Fushimi Inari Taisha, Kyoto', q: 'Fushimi Inari Taisha, Kyoto' }],
  },
  {
    title: 'Hike Up Namsan for Sunrise at N Seoul Tower',
    description: 'Skip the cable car and walk up Namsan in the dark. Photograph the city waking up from the top, with the tower behind you.',
    location: 'N Seoul Tower, Seoul',
    cardSuit: 'spades', cardRank: 'Q',
    places: [{ name: 'N Seoul Tower', q: '남산서울타워' }],
  },
  {
    title: 'Run the Central Park Reservoir Loop',
    description: 'Jog the 1.5-mile loop around the Jacqueline Kennedy Onassis Reservoir with the midtown skyline across the water. Show the skyline in your photo.',
    location: 'Central Park, New York',
    cardSuit: 'spades', cardRank: 'J',
    places: [{ name: 'Jacqueline Kennedy Onassis Reservoir', q: 'Jacqueline Kennedy Onassis Reservoir, New York' }],
  },
  {
    title: 'Walk the Brooklyn Bridge and Back Before Breakfast',
    description: 'Cross the Brooklyn Bridge on foot at dawn, touch the far tower, and walk back. Stay in the pedestrian lane and watch for cyclists.',
    location: 'Brooklyn Bridge, New York',
    cardSuit: 'spades', cardRank: 'Q',
    places: [{ name: 'Brooklyn Bridge', q: 'Brooklyn Bridge, New York' }],
  },
  {
    title: 'Hike to the Hollywood Sign Viewpoint',
    description: 'Hike from Griffith Observatory along the trail to a viewpoint with the Hollywood Sign in full view. Bring water and start early.',
    location: 'Griffith Observatory, Los Angeles',
    cardSuit: 'spades', cardRank: 'K',
    places: [{ name: 'Griffith Observatory', q: 'Griffith Observatory, Los Angeles' }],
  },
  {
    title: 'Walk Day One of the Camino de Santiago Over the Pyrenees',
    description: 'Start in Saint-Jean-Pied-de-Port and walk the ~25 km first stage over the Pyrenees toward Roncesvalles. Get your credencial stamped along the way.',
    location: 'Saint-Jean-Pied-de-Port, France',
    cardSuit: 'spades', cardRank: 'A',
    places: [{ name: 'Saint-Jean-Pied-de-Port', q: 'Saint-Jean-Pied-de-Port, France' }],
  },
  {
    title: 'Squeeze Into a Tiny Golden Gai Bar and Befriend the Regulars',
    description: 'Pick one of the six-seat bars in Golden Gai, order a drink, and get to know the regulars by the end of the night. Many have a cover charge, so check the sign first.',
    location: 'Golden Gai, Tokyo',
    cardSuit: 'hearts', cardRank: 'Q',
    places: [{ name: 'Golden Gai, Shinjuku', q: 'Golden Gai, Shinjuku, Tokyo' }],
  },
  {
    title: 'Let a Boqueria Vendor Choose Your Lunch',
    description: 'Walk into La Boqueria, tell a vendor your budget and what you like, and eat exactly what they put in your hands. No second-guessing.',
    location: 'La Boqueria, Barcelona',
    cardSuit: 'hearts', cardRank: 'J',
    places: [{ name: 'Mercat de la Boqueria', q: 'La Boqueria, Barcelona' }],
  },
  {
    title: 'Eat What a Tsukiji Outer Market Vendor Recommends',
    description: 'Chat with a vendor at the Tsukiji Outer Market, ask what they eat for breakfast, and order it. Learn at least one new Japanese food word.',
    location: 'Tsukiji Outer Market, Tokyo',
    cardSuit: 'hearts', cardRank: 'Q',
    places: [{ name: 'Tsukiji Outer Market', q: 'Tsukiji Outer Market, Tokyo' }],
  },
  {
    title: 'Beat a Stranger at Chess in Washington Square Park',
    description: 'Sit at a chess table in Washington Square Park and challenge a stranger to a game. Win, lose, or draw, finish the game.',
    location: 'Washington Square Park, New York',
    cardSuit: 'diamonds', cardRank: 'Q',
    places: [{ name: 'Washington Square Park chess tables', q: 'Washington Square Park, New York' }],
  },
  {
    title: 'Sketch the Sagrada Família Nativity Facade',
    description: 'Sit across from the Nativity Facade and sketch it for at least 30 minutes. Notice the details that photos flatten. Photograph your sketch with the facade behind it.',
    location: 'Sagrada Família, Barcelona',
    cardSuit: 'diamonds', cardRank: 'J',
    places: [{ name: 'Sagrada Família', q: 'Sagrada Família, Barcelona' }],
  },
  {
    title: 'Decode the Inscription Above the Pantheon Entrance',
    description: 'Find the inscription over the portico, work out what it says and who "Agrippa" was, then explain the catch (Hadrian rebuilt it) to someone in your group.',
    location: 'Pantheon, Rome',
    cardSuit: 'diamonds', cardRank: 'Q',
    places: [{ name: 'Pantheon', q: 'Pantheon, Rome' }],
  },
  {
    title: 'Find the Viking Graffiti in the Hagia Sophia Gallery',
    description: 'Climb to the upper gallery and find the runic graffiti carved by a Viking guard centuries ago. Learn who might have written it and photograph the marks.',
    location: 'Hagia Sophia, Istanbul',
    cardSuit: 'diamonds', cardRank: 'K',
    places: [{ name: 'Hagia Sophia', q: 'Hagia Sophia, Istanbul' }],
  },
  {
    title: 'Clap at El Castillo and Hear the Pyramid Answer Back',
    description: 'Stand at the foot of the main staircase of El Castillo, clap once, and listen for the chirp that echoes back. Find out why the steps do that.',
    location: 'Chichén Itzá, Mexico',
    cardSuit: 'diamonds', cardRank: 'Q',
    places: [{ name: 'El Castillo, Chichén Itzá', q: 'Chichen Itza, Yucatan' }],
  },
  {
    title: 'Recreate the Abbey Road Crossing With 4+ People',
    description: 'Get at least four friends to walk the Abbey Road zebra crossing in a line, Beatles style. Be quick, be safe, and let the traffic through between takes.',
    location: 'Abbey Road, London',
    cardSuit: 'clubs', cardRank: 'Q',
    places: [{ name: 'Abbey Road Crossing', q: 'Abbey Road Studios, London' }],
  },
  {
    title: 'Row a Boat Together at the Loeb Boathouse',
    description: 'Rent a rowboat as a group of three or more and row a full lap of the Central Park Lake. Swap rowers at least once.',
    location: 'Central Park, New York',
    cardSuit: 'clubs', cardRank: 'J',
    places: [{ name: 'Loeb Boathouse, Central Park', q: 'Loeb Boathouse, New York' }],
  },
  {
    title: 'Cross the Golden Gate Bridge on Foot as a Team of 4+',
    description: 'Walk the whole span as a group, together, and take a team photo at the midpoint. It is about 1.7 miles each way, and the wind is real.',
    location: 'Golden Gate Bridge, San Francisco',
    cardSuit: 'clubs', cardRank: 'K',
    places: [{ name: 'Golden Gate Bridge', q: 'Golden Gate Bridge, San Francisco' }],
  },
  {
    title: 'Land a Synchronized Group Jump in Front of the Eiffel Tower',
    description: 'Get your whole group airborne at the same moment with the Eiffel Tower behind you. Take as many tries as you need, and keep the pathways clear.',
    location: 'Trocadéro, Paris',
    cardSuit: 'clubs', cardRank: 'J',
    places: [{ name: 'Trocadéro Gardens', q: 'Trocadéro Gardens, Paris' }],
  },
];

// ── Geocoding ─────────────────────────────────────────────────────────────────────────
const cache = new Map<string, { lat: number; lng: number; address: string } | null>();
let lastCall = 0;

async function geocode(q: string) {
  if (cache.has(q)) return cache.get(q)!;
  const wait = lastCall + 1100 - Date.now(); // Nominatim usage policy: max 1 request/second
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
  let result: { lat: number; lng: number; address: string } | null = null;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'VoyageTripPlanner-seed-script/1.0' } });
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

async function resolve(specs: PlaceSpec[]) {
  const out: { name: string; address: string; lat: number; lng: number }[] = [];
  for (const s of specs) {
    const g = await geocode(s.q);
    if (!g) {
      console.log(`    ! could not geocode "${s.q}"`);
      return null; // a quest is only written with all of its places
    }
    console.log(`    ${s.name}  ->  ${g.lat}, ${g.lng}   (${g.address.split(',').slice(0, 3).join(',')})`);
    out.push({ name: s.name, address: g.address, lat: g.lat, lng: g.lng });
  }
  return out;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  const creator = await User.findOne({ email: CREATOR_EMAIL }).select('_id name');
  if (!creator) {
    console.error(`User ${CREATOR_EMAIL} not found`);
    process.exit(1);
  }
  console.log(write ? '[WRITE MODE]' : '[dry run: nothing will be written]');

  let pinned = 0;
  let created = 0;

  console.log('\n== Pin existing quests ==');
  for (const pin of PINS) {
    const quest = await PublicSidequest.findOne({ title: pin.title, 'createdBy.userId': creator._id });
    if (!quest) { console.log(`- skip "${pin.title}": not found`); continue; }
    if (quest.places?.length) { console.log(`- skip "${pin.title}": already pinned`); continue; }
    console.log(`- ${pin.title}`);
    const places = await resolve(pin.places);
    if (!places) continue;
    if (write) {
      quest.places = places;
      if (pin.location) quest.location = pin.location;
      await quest.save();
    }
    pinned++;
  }

  console.log('\n== New place-specific quests ==');
  for (const nq of NEW_QUESTS) {
    if (await PublicSidequest.exists({ title: nq.title })) { console.log(`- skip "${nq.title}": already exists`); continue; }
    console.log(`- ${nq.cardRank}${nq.cardSuit[0]} ${nq.title}`);
    const places = await resolve(nq.places);
    if (!places) continue;
    if (write) {
      await PublicSidequest.create({
        title: nq.title,
        description: nq.description,
        location: nq.location,
        places,
        cardSuit: nq.cardSuit,
        cardRank: nq.cardRank,
        xpReward: computeXp(nq.cardSuit, nq.cardRank),
        official: true,
        createdBy: { userId: creator._id, userName: creator.name },
        claims: [],
        completions: [],
      });
    }
    created++;
  }

  console.log(`\n${write ? 'Wrote' : 'Would write'}: ${pinned} quests pinned, ${created} quests created.`);
  if (!write) console.log('Re-run with --write to apply.');
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
