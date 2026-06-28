import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { User } from '../models/User';
import { PublicSidequest } from '../models/PublicSidequest';

const CREATOR_EMAIL = 'dylan.luo.777@gmail.com';

function computeXp(suit: 'spades' | 'hearts' | 'diamonds' | 'clubs', rank: 'J' | 'Q' | 'K' | 'A'): number {
  const BASE_XP = { J: 250, Q: 500, K: 750, A: 1000 };
  const MULTIPLIER = { spades: 1.5, hearts: 1.0, diamonds: 1.2, clubs: 1.1 };
  return Math.round(BASE_XP[rank] * MULTIPLIER[suit] / 5) * 5;
}

const sidequests: Array<{
  title: string;
  description: string;
  location: string;
  cardSuit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  cardRank: 'J' | 'Q' | 'K' | 'A';
  event?: { daysFromNow: number; maxParticipants: number };
}> = [
  {
    title: 'Summit a Peak Before Sunrise',
    description: 'Start your hike in the dark and reach the summit in time to watch the sun rise over the horizon. No headphones — just you and the mountain.',
    location: 'Rocky Mountain National Park, CO',
    cardSuit: 'spades',
    cardRank: 'K',
  },
  {
    title: 'Eat at a Restaurant Where You Can\'t Read the Menu',
    description: 'Walk into a restaurant where the menu is entirely in a language you don\'t speak. Order without Google Translate. Trust the process.',
    location: 'Any city abroad',
    cardSuit: 'hearts',
    cardRank: 'J',
  },
  {
    title: 'Navigate a Foreign City Using Only a Paper Map',
    description: 'Print a map before you leave. No GPS, no phone navigation for the entire day. Get lost on purpose and find your way back.',
    location: 'Tokyo, Japan',
    cardSuit: 'diamonds',
    cardRank: 'Q',
  },
  {
    title: 'Organize a Rooftop Sunset Picnic for Strangers',
    description: 'Plan a group picnic, invite people you\'ve met on your trip, and watch the sunset together. Bring enough food for at least 5 people.',
    location: 'Lisbon, Portugal',
    cardSuit: 'clubs',
    cardRank: 'Q',
    event: { daysFromNow: 14, maxParticipants: 10 },
  },
  {
    title: 'Free Solo a Via Ferrata Route',
    description: 'Complete an iron-path mountain climbing route from start to finish. The exposure is real — so is the reward.',
    location: 'Dolomites, Italy',
    cardSuit: 'spades',
    cardRank: 'A',
  },
  {
    title: 'Start a Conversation That Lasts Over 2 Hours with a Local',
    description: 'Sit down at a bar, café, or park. Find someone local. Listen more than you speak. No agenda — just genuine curiosity.',
    location: 'Anywhere',
    cardSuit: 'hearts',
    cardRank: 'Q',
  },
  {
    title: 'Sketch Every Landmark You Visit in One Day',
    description: 'Bring a sketchbook and draw — not photograph — every major landmark you visit during a full day of exploring. No artistic skill required.',
    location: 'Rome, Italy',
    cardSuit: 'diamonds',
    cardRank: 'J',
  },
  {
    title: 'Plan and Lead a Full-Day Group Itinerary for 5+ People',
    description: 'Take charge. Research, book, and execute a full day out for at least 5 fellow travelers. Handle logistics, meals, and backup plans.',
    location: 'Barcelona, Spain',
    cardSuit: 'clubs',
    cardRank: 'K',
    event: { daysFromNow: 21, maxParticipants: 8 },
  },
  {
    title: 'Swim to an Island',
    description: 'Find an island or rock formation you can see from shore and swim to it. Assess conditions carefully — this is not for the faint of heart.',
    location: 'Adriatic Coast, Croatia',
    cardSuit: 'spades',
    cardRank: 'Q',
  },
  {
    title: 'Decode the History of a Place Most Tourists Skip',
    description: 'Pick a non-touristy neighborhood or monument, research its full history, and write a short essay or journal entry on what you discover.',
    location: 'Istanbul, Turkey',
    cardSuit: 'diamonds',
    cardRank: 'K',
  },
  {
    title: 'Cook a Local Dish from Scratch Using Only Ingredients from a Street Market',
    description: 'No grocery stores. Go to the local market, buy what you need, find a kitchen, and cook a traditional dish of the country you\'re in.',
    location: 'Marrakech, Morocco',
    cardSuit: 'hearts',
    cardRank: 'K',
  },
  {
    title: 'Cross a Country Border on Foot',
    description: 'Walk across an international land border. It doesn\'t matter which one — just do it on foot.',
    location: 'Europe / Southeast Asia',
    cardSuit: 'diamonds',
    cardRank: 'A',
  },
];

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  console.log('[db] connected');

  const deleted = await PublicSidequest.deleteMany({});
  console.log(`[clear] deleted ${deleted.deletedCount} existing sidequests`);

  const creator = await User.findOne({ email: CREATOR_EMAIL }).select('_id name');
  if (!creator) {
    console.error(`User ${CREATOR_EMAIL} not found — create an account first`);
    process.exit(1);
  }

  const now = new Date();
  const docs = sidequests.map(sq => ({
    title: sq.title,
    description: sq.description,
    location: sq.location,
    cardSuit: sq.cardSuit,
    cardRank: sq.cardRank,
    xpReward: computeXp(sq.cardSuit, sq.cardRank),
    createdBy: { userId: creator._id, userName: creator.name },
    claims: [],
    completions: [],
    ...(sq.event && {
      event: {
        date: new Date(now.getTime() + sq.event.daysFromNow * 86_400_000),
        maxParticipants: sq.event.maxParticipants,
        enrollments: [],
      },
    }),
  }));

  const inserted = await PublicSidequest.insertMany(docs);
  console.log(`[seed] inserted ${inserted.length} sidequests`);
  inserted.forEach(s => console.log(`  ${s.cardSuit.padEnd(9)} ${s.cardRank} — ${s.xpReward} XP — ${s.title}`));

  await mongoose.disconnect();
  console.log('[done]');
}

main().catch(err => { console.error(err); process.exit(1); });
