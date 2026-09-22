/**
 * Creates or updates every index defined in the schemas. Run after a deploy
 * that changes indexes — the app itself never builds indexes at request time
 * in production.
 */
import { config } from "dotenv";
import mongoose from "mongoose";
import {
  Category,
  Comment,
  CommentVote,
  Invite,
  Notification,
  Passkey,
  Problem,
  ProblemBookmark,
  ProblemClick,
  ProblemValidation,
  RateLimit,
  Report,
  Setting,
  SiteVisit,
  Solution,
  SolutionVote,
  User,
  WaitlistSignup,
} from "../src/models";

config({ path: [".env.local", ".env"], quiet: true });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "problems_live";

if (!MONGODB_URI) {
  console.error(
    "MONGODB_URI is not set. Copy .env.example to .env.local first.",
  );
  process.exit(1);
}

const MODELS = [
  User,
  Category,
  Problem,
  ProblemBookmark,
  ProblemClick,
  Solution,
  Comment,
  ProblemValidation,
  SolutionVote,
  CommentVote,
  Report,
  Notification,
  Setting,
  RateLimit,
  SiteVisit,
  Invite,
  Passkey,
  WaitlistSignup,
];

async function main() {
  await mongoose.connect(MONGODB_URI!, { dbName: MONGODB_DB });

  for (const model of MODELS) {
    await model.syncIndexes();
    const indexes = await model.collection.indexes();
    console.log(`✓ ${model.modelName.padEnd(18)} ${indexes.length} indexes`);
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("✗ Index sync failed:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
