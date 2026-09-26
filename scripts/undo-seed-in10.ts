/**
 * Reverses scripts/seed-in10.ts and ONLY that.
 *
 * Finds every user whose googleId matches "seed-in10-*", then deletes:
 *   - the problems those users authored
 *   - every comment on those problems (regardless of who wrote it — see
 *     warning below) and every comment those users wrote anywhere else
 *   - every bookmark on those problems, and every bookmark those users made
 *   - the users themselves
 *   - decrements the category problemCount increments that seeding added
 *
 * Nothing else in the database is touched.
 *
 * ⚠️  If a real user has, in the meantime, commented on or bookmarked one of
 * the seeded problems, that comment/bookmark is deleted too — the problem
 * itself is being removed, so nothing can be left pointing at it. Run this
 * before other users have had a chance to interact with the seeded content
 * if you want to avoid that.
 *
 * Run with: npx tsx scripts/undo-seed-in10.ts
 */
import { config } from "dotenv";
import { Category, Comment, Problem, ProblemBookmark, User } from "../src/models";
import mongoose from "mongoose";

config({ path: [".env.local", ".env"], quiet: true });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "problems_live";
const GOOGLE_ID_PREFIX = "seed-in10-";

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set. Copy .env.example to .env.local first.");
  process.exit(1);
}

async function main() {
  console.log(`→ Connecting to ${MONGODB_DB}…`);
  await mongoose.connect(MONGODB_URI!, { dbName: MONGODB_DB });

  const seededUsers = await User.find({
    googleId: { $regex: `^${GOOGLE_ID_PREFIX}` },
  });

  if (seededUsers.length === 0) {
    console.log("Nothing tagged \"seed-in10-*\" found. Nothing to undo.");
    await mongoose.disconnect();
    return;
  }

  const userIds = seededUsers.map((u) => u._id);
  console.log(`→ Found ${userIds.length} seeded users.`);

  const seededProblems = await Problem.find({ authorId: { $in: userIds } });
  const problemIds = seededProblems.map((p) => p._id);
  console.log(`→ Found ${problemIds.length} seeded problems.`);

  const [commentResult, bookmarkResult] = await Promise.all([
    Comment.deleteMany({
      $or: [{ problemId: { $in: problemIds } }, { authorId: { $in: userIds } }],
    }),
    ProblemBookmark.deleteMany({
      $or: [{ problemId: { $in: problemIds } }, { userId: { $in: userIds } }],
    }),
  ]);
  console.log(`→ Deleted ${commentResult.deletedCount} comments.`);
  console.log(`→ Deleted ${bookmarkResult.deletedCount} bookmarks.`);

  console.log("→ Reverting category problem counts…");
  const categoryDeltas = new Map<string, number>();
  for (const problem of seededProblems) {
    const id = String(problem.categoryId);
    categoryDeltas.set(id, (categoryDeltas.get(id) ?? 0) + 1);
  }
  await Promise.all(
    [...categoryDeltas.entries()].map(([id, delta]) =>
      Category.updateOne({ _id: id }, { $inc: { problemCount: -delta } })
    )
  );

  const problemResult = await Problem.deleteMany({ _id: { $in: problemIds } });
  console.log(`→ Deleted ${problemResult.deletedCount} problems.`);

  const userResult = await User.deleteMany({ _id: { $in: userIds } });
  console.log(`→ Deleted ${userResult.deletedCount} users.`);

  console.log("\n✓ undo-seed-in10 complete — all seeded content removed.\n");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("\n✗ undo-seed-in10 failed:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
