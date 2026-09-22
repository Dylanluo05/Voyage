import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { Trip } from '../models/Trip';

// Moves the legacy trip-wide `budget` onto the owner's entry in `budgets`.
// Safe to re-run: only touches trips that still have a `budget` field.
async function main() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const res = await Trip.collection.updateMany(
    { budget: { $exists: true } },
    [
      {
        $set: {
          budgets: {
            $cond: [
              { $gt: ['$budget', null] },
              [{ userId: '$owner', amount: '$budget' }],
              { $ifNull: ['$budgets', []] },
            ],
          },
        },
      },
      { $unset: 'budget' },
    ]
  );
  console.log(`Migrated ${res.modifiedCount} trips`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
