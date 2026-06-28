import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { User } from '../models/User';
import { PublicSidequest } from '../models/PublicSidequest';

const TEST_EMAIL = 'dylan.luo.777@gmail.com';

const testCompletions = [
  { cardSuit: 'spades' as const, cardRank: 'K' as const, title: 'Hike to a Hidden Waterfall', xpEarned: 750 },
  { cardSuit: 'hearts' as const, cardRank: 'Q' as const, title: 'Strike Up a Conversation with a Local', xpEarned: 400 },
  { cardSuit: 'diamonds' as const, cardRank: 'A' as const, title: 'Navigate a Foreign City Without Google Maps', xpEarned: 900 },
  { cardSuit: 'clubs' as const, cardRank: 'J' as const, title: 'Coordinate a Spontaneous Group Picnic', xpEarned: 330 },
  { cardSuit: 'spades' as const, cardRank: '9' as const, title: 'Swim in a Natural Body of Water', xpEarned: 340 },
  { cardSuit: 'hearts' as const, cardRank: '6' as const, title: 'Try Street Food You\'ve Never Heard Of', xpEarned: 150 },
  { cardSuit: 'diamonds' as const, cardRank: '8' as const, title: 'Sketch a Landmark from Memory', xpEarned: 240 },
];

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  console.log('[db] connected');

  const user = await User.findOne({ email: TEST_EMAIL });
  if (!user) { console.error('User not found'); process.exit(1); }

  // Find any existing sidequest to reference, or use a placeholder id
  const anySidequest = await PublicSidequest.findOne();
  const placeholderId = anySidequest?._id ?? new mongoose.Types.ObjectId();

  const historyEntries = testCompletions.map((c, i) => ({
    sidequestId: placeholderId,
    title: c.title,
    cardSuit: c.cardSuit,
    cardRank: c.cardRank,
    xpEarned: c.xpEarned,
    completedAt: new Date(Date.now() - i * 86_400_000), // spread across past 7 days
  }));

  const totalXp = testCompletions.reduce((sum, c) => sum + c.xpEarned, 0);

  await User.findByIdAndUpdate(user._id, {
    $set: { xp: totalXp },
    $push: { sidequestHistory: { $each: historyEntries } },
  });

  console.log(`[done] added ${historyEntries.length} completions, ${totalXp} XP to ${user.email}`);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
