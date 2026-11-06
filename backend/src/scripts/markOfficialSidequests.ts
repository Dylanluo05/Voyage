// One-off: flag the existing Voyage-made quests (created by the seed account) as official,
// so they get illustrated covers. Non-destructive: only sets `official: true`; run once.
//   npx ts-node src/scripts/markOfficialSidequests.ts
import 'dotenv/config';
import mongoose from 'mongoose';
import { PublicSidequest } from '../models/PublicSidequest';
import { User } from '../models/User';

const CREATOR_EMAIL = 'dylan.luo.777@gmail.com';

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  const creator = await User.findOne({ email: CREATOR_EMAIL }).select('_id');
  if (!creator) {
    console.error(`User ${CREATOR_EMAIL} not found`);
    process.exit(1);
  }
  const res = await PublicSidequest.updateMany(
    { 'createdBy.userId': creator._id, official: { $ne: true } },
    { $set: { official: true } },
  );
  console.log(`[done] marked ${res.modifiedCount} quests official`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
