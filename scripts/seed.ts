/**
 * Development seed. Wipes the configured database and repopulates it with
 * realistic content so the product can be judged on how it actually reads.
 *
 * Run with: npm run seed
 */
import { config } from "dotenv";
import mongoose from "mongoose";
import {
  Category,
  Comment,
  CommentVote,
  Notification,
  Problem,
  ProblemValidation,
  RateLimit,
  Report,
  Setting,
  Solution,
  SolutionVote,
  User,
  computeHotScore,
  problemSignal,
} from "../src/models";
import { SEED_CATEGORIES } from "../src/lib/constants";
import { nextAvailableSlug, slugify } from "../src/lib/utils/slug";
import {
  SEED_COMMENTS,
  SEED_PROBLEMS,
  SEED_SOLUTIONS,
  SEED_USERS,
} from "./seed-data";

config({ path: [".env.local", ".env"], quiet: true });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "problems_live";

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set. Copy .env.example to .env.local first.");
  process.exit(1);
}

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 86_400_000 - Math.random() * 3_600_000);

/** Deterministic-ish pick so reruns produce comparable-looking data. */
function sample<T>(items: T[], count: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < count && pool.length > 0) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

async function main() {
  console.log(`→ Connecting to ${MONGODB_DB}…`);
  await mongoose.connect(MONGODB_URI!, { dbName: MONGODB_DB });

  console.log("→ Clearing existing data…");
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Problem.deleteMany({}),
    Solution.deleteMany({}),
    Comment.deleteMany({}),
    ProblemValidation.deleteMany({}),
    SolutionVote.deleteMany({}),
    CommentVote.deleteMany({}),
    Report.deleteMany({}),
    Notification.deleteMany({}),
    RateLimit.deleteMany({}),
    Setting.deleteMany({}),
  ]);

  // Indexes are created explicitly here rather than on every app boot.
  console.log("→ Building indexes…");
  await Promise.all([
    User.syncIndexes(),
    Category.syncIndexes(),
    Problem.syncIndexes(),
    Solution.syncIndexes(),
    Comment.syncIndexes(),
    ProblemValidation.syncIndexes(),
    SolutionVote.syncIndexes(),
    CommentVote.syncIndexes(),
    Report.syncIndexes(),
    Notification.syncIndexes(),
    RateLimit.syncIndexes(),
    Setting.syncIndexes(),
  ]);

  console.log("→ Creating categories…");
  const categoryDocs = await Category.insertMany(
    SEED_CATEGORIES.map((category, index) => ({
      ...category,
      status: "approved" as const,
      order: index,
      problemCount: 0,
    }))
  );
  const categoryBySlug = new Map(categoryDocs.map((c) => [c.slug, c]));

  // One pending suggestion so the admin approval queue is not empty.
  console.log("→ Creating users…");
  const userDocs = await User.insertMany(
    SEED_USERS.map((user, index) => ({
      googleId: `seed-google-${index}`,
      email: user.email,
      emailVerified: true,
      name: user.name,
      username: user.username,
      bio: user.bio,
      avatar: undefined,
      role: user.role ?? "user",
      reputation: user.reputation,
      problemCredits: 3,
      status: "active" as const,
      createdAt: daysAgo(120 - index * 4),
    }))
  );
  const userByUsername = new Map(userDocs.map((u) => [u.username, u]));

  await Category.create({
    name: "Accessibility",
    slug: "accessibility",
    description: "Problems faced by people with disabilities using everyday products.",
    icon: "Shapes",
    status: "pending",
    order: 200,
    suggestedBy: userByUsername.get("mei")!._id,
  });

  console.log("→ Creating problems…");
  const takenSlugs = new Set<string>();
  const problemDocs = [];

  for (const seed of SEED_PROBLEMS) {
    const author = userByUsername.get(seed.author);
    const category = categoryBySlug.get(seed.category);
    if (!author || !category) continue;

    const slug = nextAvailableSlug(slugify(seed.title), takenSlugs);
    takenSlugs.add(slug);

    const createdAt = daysAgo(seed.daysAgo);
    problemDocs.push({
      authorId: author._id,
      title: seed.title,
      slug,
      description: seed.description,
      categoryId: category._id,
      location: seed.location ?? { scope: "global" as const },
      images: [],
      isAnonymous: seed.isAnonymous ?? false,
      status: seed.status ?? ("open" as const),
      moderationStatus: "approved" as const,
      moderation: { provider: "seed", score: 0, labels: [] },
      validationCount: 0,
      commentCount: 0,
      solutionCount: 0,
      hotScore: 0,
      createdAt,
      updatedAt: createdAt,
      solvedAt: seed.status === "solved" ? daysAgo(seed.daysAgo - 1) : null,
      solvedBy: seed.status === "solved" ? author._id : null,
    });
  }

  const problems = await Problem.insertMany(problemDocs);
  const problemByTitle = new Map(problems.map((p) => [p.title, p]));

  console.log("→ Creating solutions…");
  const solutionDocs = [];
  for (const seed of SEED_SOLUTIONS) {
    const problem = problemByTitle.get(seed.problemTitle);
    const author = userByUsername.get(seed.author);
    if (!problem || !author) continue;

    const createdAt = daysAgo(seed.daysAgo);
    solutionDocs.push({
      problemId: problem._id,
      authorId: author._id,
      title: seed.title,
      description: seed.description,
      url: seed.url,
      images: [],
      isAnonymous: false,
      helpfulCount: seed.helpful,
      commentCount: 0,
      status: seed.status ?? ("proposed" as const),
      moderationStatus: "approved" as const,
      moderation: { provider: "seed", score: 0, labels: [] },
      hotScore: computeHotScore(seed.helpful, createdAt),
      createdAt,
      updatedAt: createdAt,
    });
  }
  const solutions = await Solution.insertMany(solutionDocs);

  console.log("→ Creating comments…");
  const commentCountByProblem = new Map<string, number>();

  for (const seed of SEED_COMMENTS) {
    const problem = problemByTitle.get(seed.problemTitle);
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
      moderation: { provider: "seed", score: 0, labels: [] },
      helpfulCount: seed.helpful,
      replyCount: seed.replies?.length ?? 0,
      createdAt,
      updatedAt: createdAt,
    });

    const key = String(problem._id);
    commentCountByProblem.set(key, (commentCountByProblem.get(key) ?? 0) + 1);

    for (const reply of seed.replies ?? []) {
      const replyAuthor = userByUsername.get(reply.author);
      if (!replyAuthor) continue;
      const replyAt = daysAgo(reply.daysAgo);
      await Comment.create({
        problemId: problem._id,
        solutionId: null,
        parentId: root._id,
        authorId: replyAuthor._id,
        content: reply.content,
        isAnonymous: false,
        status: "visible",
        moderationStatus: "approved",
        moderation: { provider: "seed", score: 0, labels: [] },
        helpfulCount: reply.helpful,
        createdAt: replyAt,
        updatedAt: replyAt,
      });
      commentCountByProblem.set(key, (commentCountByProblem.get(key) ?? 0) + 1);
    }
  }

  // Validations are real documents so the unique index and the toggle flow
  // behave exactly as they will in production.
  console.log("→ Creating validations…");
  const validations = [];
  for (const seed of SEED_PROBLEMS) {
    const problem = problemByTitle.get(seed.title);
    if (!problem) continue;
    for (const user of userDocs) {
      if (String(user._id) === String(problem.authorId)) continue;
      // Seeded counts are far larger than the seeded user base, so a subset of
      // real voters is created and the headline count is set alongside it.
      if (Math.random() > 0.55) continue;
      validations.push({
        problemId: problem._id,
        userId: user._id,
        createdAt: daysAgo(Math.random() * seed.daysAgo),
      });
    }
  }
  await ProblemValidation.insertMany(validations, { ordered: false });

  console.log("→ Creating solution votes…");
  const solutionVotes = [];
  for (const solution of solutions) {
    for (const user of sample(userDocs, 4)) {
      if (String(user._id) === String(solution.authorId)) continue;
      solutionVotes.push({
        solutionId: solution._id,
        userId: user._id,
        createdAt: daysAgo(Math.random() * 5),
      });
    }
  }
  await SolutionVote.insertMany(solutionVotes, { ordered: false });

  console.log("→ Reconciling counters…");
  for (const seed of SEED_PROBLEMS) {
    const problem = problemByTitle.get(seed.title);
    if (!problem) continue;

    const solutionCount = solutions.filter(
      (s) => String(s.problemId) === String(problem._id)
    ).length;
    const commentCount = commentCountByProblem.get(String(problem._id)) ?? 0;

    const counts = {
      validationCount: seed.validations,
      solutionCount,
      commentCount,
    };

    await Problem.updateOne(
      { _id: problem._id },
      {
        $set: {
          ...counts,
          hotScore: computeHotScore(problemSignal(counts), problem.createdAt),
          acceptedSolutionId:
            seed.status === "solved"
              ? (solutions.find(
                  (s) => String(s.problemId) === String(problem._id)
                )?._id ?? null)
              : null,
        },
      }
    );
  }

  console.log("→ Reconciling category counts…");
  for (const category of categoryDocs) {
    const count = await Problem.countDocuments({
      categoryId: category._id,
      moderationStatus: "approved",
    });
    await Category.updateOne({ _id: category._id }, { $set: { problemCount: count } });
  }

  console.log("→ Reconciling user stats…");
  for (const user of userDocs) {
    const [problemCount, solutionCount, commentCount, solvedCount] =
      await Promise.all([
        Problem.countDocuments({ authorId: user._id, moderationStatus: "approved" }),
        Solution.countDocuments({ authorId: user._id, moderationStatus: "approved" }),
        Comment.countDocuments({ authorId: user._id, moderationStatus: "approved" }),
        Problem.countDocuments({ authorId: user._id, status: "solved" }),
      ]);

    const helpfulVotes = solutions
      .filter((s) => String(s.authorId) === String(user._id))
      .reduce((sum, s) => sum + s.helpfulCount, 0);

    const validationsReceived = SEED_PROBLEMS.filter(
      (p) => p.author === user.username
    ).reduce((sum, p) => sum + p.validations, 0);

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          "stats.problems": problemCount,
          "stats.solutions": solutionCount,
          "stats.comments": commentCount,
          "stats.solvedProblems": solvedCount,
          "stats.helpfulVotes": helpfulVotes,
          "stats.validationsReceived": validationsReceived,
        },
      }
    );
  }

  console.log("→ Creating notifications…");
  const notifications = [];
  for (const problem of problems.slice(0, 10)) {
    for (const actor of sample(userDocs, 2)) {
      if (String(actor._id) === String(problem.authorId)) continue;
      notifications.push({
        userId: problem.authorId,
        type: "problem_validated" as const,
        actorId: actor._id,
        problemId: problem._id,
        read: Math.random() > 0.5,
        createdAt: daysAgo(Math.random() * 4),
      });
    }
  }
  for (const solution of solutions.slice(0, 8)) {
    const problem = problems.find(
      (p) => String(p._id) === String(solution.problemId)
    );
    if (!problem) continue;
    notifications.push({
      userId: problem.authorId,
      type: "solution_suggested" as const,
      actorId: solution.authorId,
      problemId: problem._id,
      solutionId: solution._id,
      read: false,
      createdAt: daysAgo(Math.random() * 3),
    });
  }
  await Notification.insertMany(notifications);

  // One open report so the moderation queue has something to show.
  console.log("→ Creating a sample report…");
  const reportedComment = await Comment.findOne().sort({ createdAt: -1 }).exec();
  if (reportedComment) {
    await Report.create({
      reporterId: userByUsername.get("liam")!._id,
      targetType: "comment",
      targetId: reportedComment._id,
      reason: "spam",
      details: "Looks like it might be promoting something.",
      status: "pending",
    });
    await Comment.updateOne(
      { _id: reportedComment._id },
      { $set: { reportCount: 1 } }
    );
  }

  const [users, problemTotal, solutionTotal, commentTotal, validationTotal] =
    await Promise.all([
      User.countDocuments(),
      Problem.countDocuments(),
      Solution.countDocuments(),
      Comment.countDocuments(),
      ProblemValidation.countDocuments(),
    ]);

  console.log("\n✓ Seed complete");
  console.log(`  ${users} users`);
  console.log(`  ${categoryDocs.length + 1} categories (1 pending approval)`);
  console.log(`  ${problemTotal} problems`);
  console.log(`  ${solutionTotal} solutions`);
  console.log(`  ${commentTotal} comments`);
  console.log(`  ${validationTotal} validation records`);
  console.log(`  ${notifications.length} notifications`);
  console.log("\n  Seeded accounts are placeholders — sign in with Google to");
  console.log("  create your own. Set ADMIN_EMAILS to get admin access.\n");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("\n✗ Seed failed:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
