/**
 * Wipes every collection in the configured database. Unlike `seed.ts`, this
 * does not repopulate anything afterward — the database is left empty but
 * with its indexes intact.
 *
 * Run with: npm run db:reset
 */
import { config } from "dotenv";
import mongoose from "mongoose";
import {
  AuditLog,
  Category,
  Comment,
  CommentAward,
  CommentVote,
  Notification,
  Problem,
  ProblemBookmark,
  ProblemValidation,
  RateLimit,
  Report,
  Setting,
  Solution,
  SolutionVote,
  User,
} from "../src/models";

config({ path: [".env.local", ".env"], quiet: true });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "problems_live";

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set. Copy .env.example to .env.local first.");
  process.exit(1);
}

async function main() {
  console.log(`→ Connecting to ${MONGODB_DB}…`);
  await mongoose.connect(MONGODB_URI!, { dbName: MONGODB_DB });

  console.log("→ Clearing all collections…");
  const results = await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Problem.deleteMany({}),
    ProblemBookmark.deleteMany({}),
    Solution.deleteMany({}),
    Comment.deleteMany({}),
    CommentAward.deleteMany({}),
    ProblemValidation.deleteMany({}),
    SolutionVote.deleteMany({}),
    CommentVote.deleteMany({}),
    Report.deleteMany({}),
    Notification.deleteMany({}),
    RateLimit.deleteMany({}),
    Setting.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  const total = results.reduce((sum, r) => sum + r.deletedCount, 0);
  console.log(`\n✓ Database cleared — ${total} documents removed.\n`);

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("\n✗ Reset failed:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
