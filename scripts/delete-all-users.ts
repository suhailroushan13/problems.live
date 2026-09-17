/**
 * Removes standard user accounts and their user-owned interactions while
 * preserving administrators, moderators, problems, and solutions.
 *
 * Run a preview: pnpm deleteall
 * Delete after reviewing: pnpm deleteall -- --confirm
 */
import { config } from "dotenv";
import mongoose, { type Types } from "mongoose";
import {
  AuditLog,
  Category,
  Comment,
  CommentAward,
  CommentVote,
  Notification,
  Passkey,
  Problem,
  ProblemBookmark,
  ProblemClick,
  ProblemValidation,
  Solution,
  SolutionVote,
  Report,
  User,
} from "../src/models";

config({ path: [".env.local", ".env"], quiet: true });

const mongodbUri = process.env.MONGODB_URI;
const mongodbDbName = process.env.MONGODB_DB || "problems_live";
const confirmed = process.argv.includes("--confirm");

if (!mongodbUri) {
  console.error("MONGODB_URI is not set. Copy .env.example to .env.local first.");
  process.exit(1);
}

function incrementOperations(
  counts: Map<string, number>,
  field: string,
) {
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

  const users = await User.find({ role: "user" }, { _id: 1 }).lean().exec();
  const userIds = users.map((user) => user._id);

  if (userIds.length === 0) {
    console.log("✓ No standard user accounts found. Admins and moderators were not touched.");
    return;
  }

  const userFilter = { $in: userIds };
  const ownedProblems = await Problem.find(
    { authorId: userFilter },
    { _id: 1, categoryId: 1, moderationStatus: 1 },
  ).lean().exec();
  const ownedProblemIds = ownedProblems.map((problem) => problem._id);
  const [ownedSolutions, ownedComments] = await Promise.all([
    Solution.find({ problemId: { $in: ownedProblemIds } }, { _id: 1 }).lean().exec(),
    Comment.find({ problemId: { $in: ownedProblemIds } }, { _id: 1 }).lean().exec(),
  ]);
  const ownedSolutionIds = ownedSolutions.map((solution) => solution._id);
  const ownedCommentIds = ownedComments.map((comment) => comment._id);
  const [
    bookmarks,
    validations,
    solutionVotes,
    commentVotes,
    awards,
    comments,
    counts,
  ] = await Promise.all([
    ProblemBookmark.find({ userId: userFilter }, { problemId: 1 }).lean().exec(),
    ProblemValidation.find({ userId: userFilter }, { problemId: 1 }).lean().exec(),
    SolutionVote.find({ userId: userFilter }, { solutionId: 1 }).lean().exec(),
    CommentVote.find({ userId: userFilter }, { commentId: 1, direction: 1 }).lean().exec(),
    CommentAward.find({ userId: userFilter }, { commentId: 1 }).lean().exec(),
    Comment.find(
      { authorId: userFilter },
      { problemId: 1, solutionId: 1, parentId: 1 },
    ).lean().exec(),
    Promise.all([
      Passkey.countDocuments({ userId: userFilter }),
      Notification.countDocuments({ $or: [{ userId: userFilter }, { actorId: userFilter }] }),
      AuditLog.countDocuments({ actorId: userFilter }),
    ]),
  ]);

  const [passkeys, notifications, auditLogs] = counts;
  console.log("→ Preview");
  console.table({
    users: userIds.length,
    userProblems: ownedProblemIds.length,
    bookmarks: bookmarks.length,
    validations: validations.length,
    solutionVotes: solutionVotes.length,
    commentVotes: commentVotes.length,
    commentAwards: awards.length,
    commentsAndReplies: comments.length,
    passkeys,
    notifications,
    auditLogs,
  });

  if (!confirmed) {
    console.log("\nNo data was deleted. Run `pnpm deleteall -- --confirm` to perform this exact deletion.");
    return;
  }

  const bookmarkDeltas = new Map<string, number>();
  const validationDeltas = new Map<string, number>();
  const solutionHelpfulDeltas = new Map<string, number>();
  const commentHelpfulDeltas = new Map<string, number>();
  const commentAwardDeltas = new Map<string, number>();
  const problemCommentDeltas = new Map<string, number>();
  const solutionCommentDeltas = new Map<string, number>();
  const replyDeltas = new Map<string, number>();
  const categoryDeltas = new Map<string, number>();

  for (const problem of ownedProblems) {
    if (problem.moderationStatus === "approved") addCount(categoryDeltas, problem.categoryId, -1);
  }

  for (const bookmark of bookmarks) addCount(bookmarkDeltas, bookmark.problemId, -1);
  for (const validation of validations) addCount(validationDeltas, validation.problemId, -1);
  for (const vote of solutionVotes) addCount(solutionHelpfulDeltas, vote.solutionId, -1);
  for (const vote of commentVotes) {
    addCount(commentHelpfulDeltas, vote.commentId, vote.direction === "up" ? -1 : 1);
  }
  for (const award of awards) addCount(commentAwardDeltas, award.commentId, -1);
  for (const comment of comments) {
    addCount(problemCommentDeltas, comment.problemId, -1);
    addCount(solutionCommentDeltas, comment.solutionId, -1);
    addCount(replyDeltas, comment.parentId, -1);
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
    ProblemBookmark.deleteMany({ userId: userFilter }),
    ProblemValidation.deleteMany({ userId: userFilter }),
    SolutionVote.deleteMany({ userId: userFilter }),
    CommentVote.deleteMany({ userId: userFilter }),
    CommentAward.deleteMany({ userId: userFilter }),
    Comment.deleteMany({ authorId: userFilter }),
    Passkey.deleteMany({ userId: userFilter }),
    Notification.deleteMany({ $or: [{ userId: userFilter }, { actorId: userFilter }] }),
    AuditLog.deleteMany({ actorId: userFilter }),
    // Solutions on problems that survive remain available without an attached profile.
    Solution.updateMany({ authorId: userFilter }, { $set: { isAnonymous: true } }),
  ]);

  await Promise.all([
    categoryDeltas.size ? Category.bulkWrite(incrementOperations(categoryDeltas, "problemCount") as never[]) : null,
    bookmarkDeltas.size ? Problem.bulkWrite(incrementOperations(bookmarkDeltas, "bookmarkCount") as never[]) : null,
    validationDeltas.size ? Problem.bulkWrite(incrementOperations(validationDeltas, "validationCount") as never[]) : null,
    solutionHelpfulDeltas.size ? Solution.bulkWrite(incrementOperations(solutionHelpfulDeltas, "helpfulCount") as never[]) : null,
    commentHelpfulDeltas.size ? Comment.bulkWrite(incrementOperations(commentHelpfulDeltas, "helpfulCount") as never[]) : null,
    commentAwardDeltas.size ? Comment.bulkWrite(incrementOperations(commentAwardDeltas, "awardCount") as never[]) : null,
    problemCommentDeltas.size ? Problem.bulkWrite(incrementOperations(problemCommentDeltas, "commentCount") as never[]) : null,
    solutionCommentDeltas.size ? Solution.bulkWrite(incrementOperations(solutionCommentDeltas, "commentCount") as never[]) : null,
    replyDeltas.size ? Comment.bulkWrite(incrementOperations(replyDeltas, "replyCount") as never[]) : null,
  ]);

  const usersDeleted = await User.deleteMany({ _id: userFilter });
  const relatedDocumentsDeleted =
    bookmarks.length + validations.length + solutionVotes.length + commentVotes.length +
    awards.length + comments.length + passkeys + notifications + auditLogs;
  console.log(`\n✓ Removed ${usersDeleted.deletedCount} standard users and ${relatedDocumentsDeleted} related documents.`);
  console.log("  Admin and moderator accounts were preserved.");
}

main()
  .catch((error) => {
    console.error("\n✗ User cleanup failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
