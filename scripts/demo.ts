/**
 * Adds a compact, realistic demo dataset without deleting existing records.
 * Safe to re-run: users and problems already present are skipped.
 *
 * Run with: pnpm demo
 */
import { config } from "dotenv";
import mongoose, { type HydratedDocument } from "mongoose";
import {
  Category,
  Comment,
  CommentAward,
  CommentVote,
  Problem,
  ProblemValidation,
  User,
  computeHotScore,
  problemSignal,
  type ICategory,
  type IComment,
  type IProblem,
  type IUser,
} from "../src/models";
import { SEED_CATEGORIES } from "../src/lib/constants";
import { nextAvailableSlug, slugify } from "../src/lib/utils/slug";
import { SEED_COMMENTS, SEED_PROBLEMS, SEED_USERS } from "./seed-data";

config({ path: [".env.local", ".env"], quiet: true });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "problems_live";

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set. Copy .env.example to .env.local first.");
  process.exit(1);
}

const DEMO_USER_COUNT = 10;
const DEMO_PROBLEM_COUNT = 15;

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 86_400_000 - Math.random() * 3_600_000);

function sample<T>(items: T[], count: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < count && pool.length > 0) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

async function ensureCategory(slug: string): Promise<HydratedDocument<ICategory>> {
  const existing = await Category.findOne({ slug }).exec();
  if (existing) return existing;

  const seed = SEED_CATEGORIES.find((category) => category.slug === slug);
  if (!seed) throw new Error(`Unknown demo category: ${slug}`);

  return Category.create({
    ...seed,
    status: "approved",
    order: SEED_CATEGORIES.findIndex((category) => category.slug === slug),
    problemCount: 0,
  });
}

async function ensureUser(
  seed: (typeof SEED_USERS)[number],
  index: number
): Promise<HydratedDocument<IUser>> {
  const existing = await User.findOne({ username: seed.username }).exec();
  if (existing) return existing;

  return User.create({
    googleId: `demo-google-${seed.username}`,
    email: seed.email,
    emailVerified: true,
    name: seed.name,
    username: seed.username,
    bio: seed.bio,
    role: seed.role ?? "user",
    reputation: seed.reputation,
    problemCredits: 3,
    status: "active",
    lastSeenAt: daysAgo(index + 1),
    createdAt: daysAgo(120 - index * 4),
  });
}

async function main() {
  console.log(`→ Connecting to ${MONGODB_DB}…`);
  await mongoose.connect(MONGODB_URI!, { dbName: MONGODB_DB });

  const seedUsers = SEED_USERS.slice(0, DEMO_USER_COUNT);
  const seededUsernames = new Set(seedUsers.map((user) => user.username));
  const seedProblems = SEED_PROBLEMS.filter((problem) =>
    seededUsernames.has(problem.author)
  ).slice(0, DEMO_PROBLEM_COUNT);

  console.log("→ Ensuring 10 demo users…");
  const userDocs = await Promise.all(seedUsers.map(ensureUser));
  const userByUsername = new Map(userDocs.map((user) => [user.username, user]));

  console.log("→ Ensuring categories…");
  const categoryBySlug = new Map<string, HydratedDocument<ICategory>>();
  for (const slug of new Set(seedProblems.map((problem) => problem.category))) {
    categoryBySlug.set(slug, await ensureCategory(slug));
  }

  const existingTitles = new Set(
    (
      await Problem.find(
        { title: { $in: seedProblems.map((problem) => problem.title) } },
        { title: 1 }
      )
        .lean()
        .exec()
    ).map((problem) => problem.title)
  );
  const existingSlugs = new Set(
    (await Problem.find({}, { slug: 1 }).lean().exec()).map((problem) => problem.slug)
  );
  const created: Array<{
    doc: HydratedDocument<IProblem>;
    seed: (typeof seedProblems)[number];
  }> = [];

  console.log("→ Adding up to 15 demo problems…");
  for (const seed of seedProblems) {
    if (existingTitles.has(seed.title)) continue;

    const author = userByUsername.get(seed.author);
    const category = categoryBySlug.get(seed.category);
    if (!author || !category) continue;

    const slug = nextAvailableSlug(slugify(seed.title), existingSlugs);
    existingSlugs.add(slug);
    const createdAt = daysAgo(seed.daysAgo);
    const doc = await Problem.create({
      authorId: author._id,
      title: seed.title,
      slug,
      description: seed.description,
      categoryId: category._id,
      location: seed.location ?? { scope: "global" },
      images: [],
      isAnonymous: seed.isAnonymous ?? false,
      priority: "normal",
      status: seed.status ?? "open",
      moderationStatus: "approved",
      moderation: { provider: "demo", score: 0, labels: [] },
      validationCount: 0,
      commentCount: 0,
      solutionCount: 0,
      hotScore: 0,
      createdAt,
      updatedAt: createdAt,
    });
    created.push({ doc, seed });
  }

  const createdByTitle = new Map(created.map(({ doc }) => [doc.title, doc]));
  const commentDocs: HydratedDocument<IComment>[] = [];
  const commentsByProblem = new Map<string, number>();

  console.log("→ Adding comments…");
  for (const seed of SEED_COMMENTS) {
    const problem = createdByTitle.get(seed.problemTitle);
    const author = userByUsername.get(seed.author);
    if (!problem || !author) continue;

    const createdAt = daysAgo(seed.daysAgo);
    const root = await Comment.create({
      problemId: problem._id,
      solutionId: null,
      parentId: null,
      authorId: author._id,
      content: seed.content,
      isAnonymous: false,
      status: "visible",
      moderationStatus: "approved",
      moderation: { provider: "demo", score: 0, labels: [] },
      helpfulCount: 0,
      awardCount: 0,
      replyCount: seed.replies?.length ?? 0,
      createdAt,
      updatedAt: createdAt,
    });
    commentDocs.push(root);
    commentsByProblem.set(String(problem._id), (commentsByProblem.get(String(problem._id)) ?? 0) + 1);

    for (const reply of seed.replies ?? []) {
      const replyAuthor = userByUsername.get(reply.author);
      if (!replyAuthor) continue;
      const replyAt = daysAgo(reply.daysAgo);
      const replyDoc = await Comment.create({
        problemId: problem._id,
        solutionId: null,
        parentId: root._id,
        authorId: replyAuthor._id,
        content: reply.content,
        isAnonymous: false,
        status: "visible",
        moderationStatus: "approved",
        moderation: { provider: "demo", score: 0, labels: [] },
        helpfulCount: 0,
        awardCount: 0,
        replyCount: 0,
        createdAt: replyAt,
        updatedAt: replyAt,
      });
      commentDocs.push(replyDoc);
      commentsByProblem.set(String(problem._id), (commentsByProblem.get(String(problem._id)) ?? 0) + 1);
    }
  }

  console.log("→ Adding validations, comment votes, and awards…");
  const validations: Array<{ problemId: mongoose.Types.ObjectId; userId: mongoose.Types.ObjectId; createdAt: Date }> = [];
  const validationCounts = new Map<string, number>();
  for (const { doc: problem } of created) {
    const voters = sample(
      userDocs.filter((user) => !user._id.equals(problem.authorId)),
      2 + (validations.length % 3)
    );
    validationCounts.set(String(problem._id), voters.length);
    voters.forEach((user) => {
      validations.push({ problemId: problem._id, userId: user._id, createdAt: daysAgo(1) });
    });
  }

  const votePlans = [
    { up: 2, down: 0, awards: 1 },
    { up: 1, down: 1, awards: 1 },
    { up: 2, down: 0, awards: 0 },
    { up: 1, down: 1, awards: 0 },
    { up: 1, down: 0, awards: 1 },
    { up: 1, down: 0, awards: 0 },
  ];
  const commentVotes: Array<{
    commentId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    direction: "up" | "down";
    createdAt: Date;
  }> = [];
  const commentAwards: Array<{
    commentId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    createdAt: Date;
  }> = [];
  const commentCounters = new Map<string, { helpfulCount: number; awardCount: number }>();

  for (const [index, comment] of commentDocs.slice(0, votePlans.length).entries()) {
    const plan = votePlans[index];
    const eligibleUsers = userDocs.filter((user) => !user._id.equals(comment.authorId));
    const voters = sample(eligibleUsers, plan.up + plan.down);
    const awarders = sample(
      eligibleUsers.filter((user) => !voters.some((voter) => voter._id.equals(user._id))),
      plan.awards
    );
    voters.forEach((user, voterIndex) => {
      commentVotes.push({
        commentId: comment._id,
        userId: user._id,
        direction: voterIndex < plan.up ? "up" : "down",
        createdAt: daysAgo(index + 1),
      });
    });
    awarders.forEach((user) => {
      commentAwards.push({ commentId: comment._id, userId: user._id, createdAt: daysAgo(index + 1) });
    });
    commentCounters.set(String(comment._id), {
      helpfulCount: plan.up - plan.down,
      awardCount: plan.awards,
    });
  }

  await Promise.all([
    ProblemValidation.insertMany(validations, { ordered: false }),
    CommentVote.insertMany(commentVotes, { ordered: false }),
    CommentAward.insertMany(commentAwards, { ordered: false }),
    Comment.bulkWrite(
      [...commentCounters.entries()].map(([id, counts]) => ({
        updateOne: { filter: { _id: id }, update: { $set: counts } },
      }))
    ),
  ]);

  for (const { doc: problem } of created) {
    const counts = {
      validationCount: validationCounts.get(String(problem._id)) ?? 0,
      commentCount: commentsByProblem.get(String(problem._id)) ?? 0,
      solutionCount: 0,
    };
    await Problem.updateOne(
      { _id: problem._id },
      { $set: { ...counts, hotScore: computeHotScore(problemSignal(counts), problem.createdAt) } }
    );
  }

  for (const category of categoryBySlug.values()) {
    const problemCount = await Problem.countDocuments({
      categoryId: category._id,
      moderationStatus: "approved",
    });
    await Category.updateOne({ _id: category._id }, { $set: { problemCount } });
  }

  await mongoose.disconnect();
  console.log("\n✓ Demo data added");
  console.log(`  ${userDocs.length} demo users ensured`);
  console.log(`  ${created.length} demo problems added`);
  console.log(`  ${commentDocs.length} comments added`);
  console.log(`  ${commentVotes.length} comment votes (${commentVotes.filter((vote) => vote.direction === "up").length} up, ${commentVotes.filter((vote) => vote.direction === "down").length} down)`);
  console.log(`  ${commentAwards.length} comment awards added\n`);
}

main().catch(async (error) => {
  console.error("\n✗ Demo seed failed:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
