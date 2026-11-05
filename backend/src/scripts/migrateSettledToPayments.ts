// One-time migration: converts legacy per-share "settled" flags into payment records.
//
// For each pair of people we net the settled amounts in both directions into a single
// payment, so every pair's balance is identical before and after. Dry run by default.
//
//   npx ts-node src/scripts/migrateSettledToPayments.ts              # preview all trips
//   npx ts-node src/scripts/migrateSettledToPayments.ts --trip <id>  # preview one trip
//   npx ts-node src/scripts/migrateSettledToPayments.ts --write      # apply
//
// Safe to run before the new backend is deployed (old code ignores `payments`) and safe to
// re-run (trips that already have migrated payments are skipped). Settled flags are left as-is.
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { Trip } from '../models/Trip';

const write = process.argv.includes('--write');
const tripArg = process.argv.indexOf('--trip');
const onlyTrip = tripArg >= 0 ? process.argv[tripArg + 1] : undefined;

const cents = (n: number) => Math.round(n * 100) / 100;

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  const filter = onlyTrip ? { _id: onlyTrip } : { 'expenses.splits.settled': true };
  const trips = await Trip.find(filter);
  let migrated = 0;

  for (const trip of trips) {
    if (trip.payments.some(p => p.migrated)) {
      console.log(`skip ${trip.title} (${trip._id}): already migrated`);
      continue;
    }
    // settledTotals[debtor][payer] = sum of settled shares debtor owed payer
    const settledTotals = new Map<string, Map<string, number>>();
    for (const expense of trip.expenses) {
      const payer = expense.paidBy.userId.toString();
      for (const split of expense.splits) {
        const debtor = split.userId.toString();
        if (!split.settled || debtor === payer) continue;
        if (!settledTotals.has(debtor)) settledTotals.set(debtor, new Map());
        const row = settledTotals.get(debtor)!;
        row.set(payer, (row.get(payer) ?? 0) + split.amount);
      }
    }

    const names = new Map<string, string>();
    for (const e of trip.expenses) {
      names.set(e.paidBy.userId.toString(), e.paidBy.userName);
      e.splits.forEach(s => names.set(s.userId.toString(), s.userName));
    }

    const seen = new Set<string>();
    const payments: { from: string; to: string; amount: number }[] = [];
    for (const [a, row] of settledTotals) {
      for (const b of row.keys()) {
        const key = [a, b].sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        const net = cents((settledTotals.get(a)?.get(b) ?? 0) - (settledTotals.get(b)?.get(a) ?? 0));
        if (Math.abs(net) < 0.01) continue;
        // net > 0: a paid b (a settled debts to b); net < 0: b paid a
        payments.push(net > 0 ? { from: a, to: b, amount: net } : { from: b, to: a, amount: -net });
      }
    }

    console.log(`\n${trip.title} (${trip._id}): ${payments.length} payment(s)`);
    for (const p of payments) {
      console.log(`  ${names.get(p.from) ?? p.from} -> ${names.get(p.to) ?? p.to}: $${p.amount.toFixed(2)}`);
    }
    if (write && payments.length > 0) {
      await Trip.updateOne(
        { _id: trip._id },
        {
          $push: {
            payments: {
              $each: payments.map(p => ({
                fromUserId: new mongoose.Types.ObjectId(p.from),
                toUserId: new mongoose.Types.ObjectId(p.to),
                amount: p.amount,
                note: 'Migrated from settled shares',
                createdBy: trip.owner,
                migrated: true,
                createdAt: new Date(),
              })),
            },
          },
        }
      );
      migrated++;
    }
  }

  console.log(write ? `\nWrote payments to ${migrated} trip(s).` : '\nDry run only. Re-run with --write to apply.');
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
