/**
 * Deletes every Problem authored by a single user (looked up by email) and
 * everything that hangs off those problems — solutions, comments,
 * bookmarks, validations, clicks, votes, awards, reports, notifications.
 *
 * The user account itself is left untouched, and nothing this user did on
 * OTHER people's problems (their own comments/votes/bookmarks elsewhere)
 * is touched.
 *
 * Run a preview: pnpm tsx scripts/delete-user-problems.ts <email>
 * Delete after reviewing: pnpm tsx scripts/delete-user-problems.ts <email> --confirm
 */
import { config } from "dotenv";
import mongoose, { type Types } from "mongoose";
import {
  Category,
  Comment,
  CommentAward,
  CommentVote,
  Notification,
  Problem,
  ProblemBookmark,
  ProblemClick,
  ProblemValidation,
  Report,
  Solution,
  SolutionVote,
  User,
} from "../src/models";

config({ path: [".env.local", ".env"], quiet: true });

const mongodbUri = process.env.MONGODB_URI;
const mongodbDbName = process.env.MONGODB_DB || "problems_live";
const confirmed = process.argv.includes("--confirm");
const email = process.argv.slice(2).find((arg) => arg.includes("@"));

if (!mongodbUri) {
  console.error("MONGODB_URI is not set. Copy .env.example to .env.local first.");
  process.exit(1);
}

if (!email) {
  console.error("Usage: tsx scripts/delete-user-problems.ts <email> [--confirm]");
  process.exit(1);
}

function incrementOperations(counts: Map<string, number>, field: string) {
  return Array.from(counts, ([id, delta]) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(id) },
      update: { $inc: { [field]: delta } },
    },
  }));
}

function addCount(counts: Map<string, number>, id: Types.ObjectId | null | undefined, delta: number) {
  if (!id) return;
  const key = String(id);
  counts.set(key, (counts.get(key) ?? 0) + delta);
}

async function main() {
  console.log(`→ Connecting to ${mongodbDbName}…`);
  await mongoose.connect(mongodbUri!, { dbName: mongodbDbName });

  const normalizedEmail = email!.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }, { _id: 1 }).lean().exec();
  if (!user) {
    console.log(`✓ No user found with email ${normalizedEmail}. Nothing to do.`);
    return;
  }

  const ownedProblems = await Problem.find(
    { authorId: user._id },
    { _id: 1, categoryId: 1, moderationStatus: 1 },
  ).lean().exec();
  const ownedProblemIds = ownedProblems.map((problem) => problem._id);

  if (ownedProblemIds.length === 0) {
    console.log(`✓ ${normalizedEmail} has no problems. Nothing to do.`);
    return;
  }

  const [ownedSolutions, ownedComments] = await Promise.all([
    Solution.find({ problemId: { $in: ownedProblemIds } }, { _id: 1 }).lean().exec(),
    Comment.find({ problemId: { $in: ownedProblemIds } }, { _id: 1 }).lean().exec(),
  ]);
  const ownedSolutionIds = ownedSolutions.map((solution) => solution._id);
  const ownedCommentIds = ownedComments.map((comment) => comment._id);

  const [bookmarks, validations, clicks, solutionVotes, commentVotes, awards, reports, notifications] =
    await Promise.all([
      ProblemBookmark.countDocuments({ problemId: { $in: ownedProblemIds } }),
      ProblemValidation.countDocuments({ problemId: { $in: ownedProblemIds } }),
      ProblemClick.countDocuments({ problemId: { $in: ownedProblemIds } }),
      SolutionVote.countDocuments({ solutionId: { $in: ownedSolutionIds } }),
      CommentVote.countDocuments({ commentId: { $in: ownedCommentIds } }),
      CommentAward.countDocuments({ commentId: { $in: ownedCommentIds } }),
      Report.countDocuments({
        $or: [
          { targetType: "problem", targetId: { $in: ownedProblemIds } },
          { targetType: "solution", targetId: { $in: ownedSolutionIds } },
          { targetType: "comment", targetId: { $in: ownedCommentIds } },
        ],
      }),
      Notification.countDocuments({
        $or: [
          { problemId: { $in: ownedProblemIds } },
          { solutionId: { $in: ownedSolutionIds } },
          { commentId: { $in: ownedCommentIds } },
        ],
      }),
    ]);

  console.log(`→ Preview for ${normalizedEmail}`);
  console.table({
    problems: ownedProblemIds.length,
    solutions: ownedSolutionIds.length,
    comments: ownedCommentIds.length,
    bookmarks,
    validations,
    clicks,
    solutionVotes,
    commentVotes,
    commentAwards: awards,
    reports,
    notifications,
  });

  if (!confirmed) {
    console.log("\nNo data was deleted. Re-run with --confirm to perform this exact deletion.");
    return;
  }

  const categoryDeltas = new Map<string, number>();
  for (const problem of ownedProblems) {
    if (problem.moderationStatus === "approved") addCount(categoryDeltas, problem.categoryId, -1);
  }

  await Promise.all([
    Problem.deleteMany({ _id: { $in: ownedProblemIds } }),
    Solution.deleteMany({ problemId: { $in: ownedProblemIds } }),
    Comment.deleteMany({ problemId: { $in: ownedProblemIds } }),
    ProblemValidation.deleteMany({ problemId: { $in: ownedProblemIds } }),
    ProblemBookmark.deleteMany({ problemId: { $in: ownedProblemIds } }),
    ProblemClick.deleteMany({ problemId: { $in: ownedProblemIds } }),
    SolutionVote.deleteMany({ solutionId: { $in: ownedSolutionIds } }),
    CommentVote.deleteMany({ commentId: { $in: ownedCommentIds } }),
    CommentAward.deleteMany({ commentId: { $in: ownedCommentIds } }),
    Report.deleteMany({
      $or: [
        { targetType: "problem", targetId: { $in: ownedProblemIds } },
        { targetType: "solution", targetId: { $in: ownedSolutionIds } },
        { targetType: "comment", targetId: { $in: ownedCommentIds } },
      ],
    }),
    Notification.deleteMany({
      $or: [
        { problemId: { $in: ownedProblemIds } },
        { solutionId: { $in: ownedSolutionIds } },
        { commentId: { $in: ownedCommentIds } },
      ],
    }),
  ]);

  await Promise.all([
    categoryDeltas.size ? Category.bulkWrite(incrementOperations(categoryDeltas, "problemCount") as never[]) : null,
    User.updateOne({ _id: user._id }, { $inc: { "stats.problems": -ownedProblemIds.length } }),
  ]);

  console.log(`\n✓ Removed ${ownedProblemIds.length} problem(s) authored by ${normalizedEmail} and their related documents.`);
  console.log("  The user account itself was not touched.");
}

main()
  .catch((error) => {
    console.error("\n✗ Deletion failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
