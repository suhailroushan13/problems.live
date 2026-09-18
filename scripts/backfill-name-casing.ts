/**
 * One-off, non-destructive backfill: title-cases every existing User's
 * `name` (e.g. "john smith" / "JOHN SMITH" -> "John Smith"), matching the
 * default casing now applied at signup (waitlist join, invite, Google
 * sign-in). Only touches rows whose name actually changes. Safe to re-run.
 *
 * Run with: npx tsx scripts/backfill-name-casing.ts
 */
import { config } from "dotenv";
import mongoose from "mongoose";
import { User } from "../src/models";
import { toTitleCase } from "../src/lib/utils/text";

config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "problems_live";
const BATCH_SIZE = 500;

async function main() {
  if (!MONGODB_URI) throw new Error("MONGODB_URI is not set.");
  console.log(`→ Connecting to ${MONGODB_DB}…`);
  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB });

  let updated = 0;
  let scanned = 0;
  let batch: { updateOne: { filter: { _id: mongoose.Types.ObjectId }; update: { $set: { name: string } } } }[] = [];

  const cursor = User.find({}, { name: 1 }).lean().cursor();
  for await (const user of cursor) {
    scanned += 1;
    const next = toTitleCase(user.name);
    if (next !== user.name) {
      batch.push({ updateOne: { filter: { _id: user._id }, update: { $set: { name: next } } } });
    }
    if (batch.length >= BATCH_SIZE) {
      await User.bulkWrite(batch);
      updated += batch.length;
      console.log(`  …updated ${updated} so far`);
      batch = [];
    }
  }
  if (batch.length > 0) {
    await User.bulkWrite(batch);
    updated += batch.length;
  }

  console.log(`→ Scanned ${scanned} users, updated ${updated} whose name casing changed.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
