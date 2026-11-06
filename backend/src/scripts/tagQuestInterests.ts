// Backfills interest chips on existing quests by inferring them from each quest's text.
//
//   npx ts-node src/scripts/tagQuestInterests.ts           # dry run: prints the distribution and samples
//   npx ts-node src/scripts/tagQuestInterests.ts --write   # apply
//   add --retag to overwrite quests that already have interests (default: only untagged quests)
//
// Non-destructive: only sets `interests`, never touches anything else.
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { PublicSidequest } from '../models/PublicSidequest';
import { INTEREST_KEYS, inferInterests } from '../lib/interests';

const write = process.argv.includes('--write');
const retag = process.argv.includes('--retag');

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  const quests = await PublicSidequest.find(retag ? {} : { $or: [{ interests: { $exists: false } }, { interests: { $size: 0 } }] });
  console.log(write ? '[WRITE MODE]' : '[dry run: nothing will be written]');
  console.log(`${quests.length} quests to tag${retag ? ' (retagging all)' : ''}`);

  const counts: Record<string, number> = Object.fromEntries(INTEREST_KEYS.map((k) => [k, 0]));
  const samples: string[] = [];
  let updated = 0;
  for (const q of quests) {
    const interests = inferInterests({ title: q.title, description: q.description, location: q.location, cardSuit: q.cardSuit });
    interests.forEach((i) => (counts[i] += 1));
    if (samples.length < 40 && Math.random() < 0.15) samples.push(`  ${q.title}  ->  ${interests.join(', ')}`);
    if (write) {
      await PublicSidequest.updateOne({ _id: q._id }, { $set: { interests } });
      updated++;
    }
  }

  console.log('\nInterest counts:', counts);
  console.log('\nSample:\n' + samples.join('\n'));
  console.log(`\n${write ? 'Tagged' : 'Would tag'} ${write ? updated : quests.length} quests.`);
  if (!write) console.log('Re-run with --write to apply.');
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
