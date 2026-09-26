/**
 * ADDITIVE seed — unlike scripts/seed.ts, this never wipes anything.
 *
 * Inserts 10 fixed Indian users (see seed-in10-data.ts), their problems,
 * comment threads, and bookmarks into whatever database MONGODB_URI points
 * to. Every user this script creates gets a googleId of the form
 * `seed-in10-<username>`, which is the only thing that marks this content as
 * seeded — undo-seed-in10.ts finds and removes it by that same marker.
 *
 * Run with: npx tsx scripts/seed-in10.ts
 * Undo with: npx tsx scripts/undo-seed-in10.ts
 */
import { config } from "dotenv";
import mongoose from "mongoose";
import {
  Category,
  Comment,
  Problem,
  ProblemBookmark,
  User,
  computeHotScore,
  problemSignal,
} from "../src/models";
import { nextAvailableSlug, slugify } from "../src/lib/utils/slug";
import {
  IN10_BOOKMARKS,
  IN10_COMMENTS,
  IN10_PROBLEMS,
  IN10_USERS,
} from "./seed-in10-data";

config({ path: [".env.local", ".env"], quiet: true });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "problems_live";
const GOOGLE_ID_PREFIX = "seed-in10-";

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set. Copy .env.example to .env.local first.");
  process.exit(1);
}

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 86_400_000 - Math.random() * 3_600_000);

async function main() {
  console.log(`→ Connecting to ${MONGODB_DB}…`);
  await mongoose.connect(MONGODB_URI!, { dbName: MONGODB_DB });

  console.log("→ Checking this hasn't already been seeded…");
  const alreadySeeded = await User.countDocuments({
    googleId: { $regex: `^${GOOGLE_ID_PREFIX}` },
  });
  if (alreadySeeded > 0) {
    console.error(
      `✗ Found ${alreadySeeded} existing user(s) tagged "${GOOGLE_ID_PREFIX}*". ` +
        "Run undo-seed-in10.ts first if you want to reseed."
    );
    process.exit(1);
  }

  console.log("→ Checking for email/username collisions with real users…");
  const emails = IN10_USERS.map((u) => u.email);
  const usernames = IN10_USERS.map((u) => u.username);
  const collisions = await User.find(
    { $or: [{ email: { $in: emails } }, { username: { $in: usernames } }] },
    { email: 1, username: 1 }
  ).lean();
  if (collisions.length > 0) {
    console.error(
      "✗ These emails/usernames already exist and would collide:",
      collisions.map((c) => c.email || c.username)
    );
    process.exit(1);
  }

  console.log("→ Resolving categories…");
  const neededSlugs = [...new Set(IN10_PROBLEMS.map((p) => p.category))];
  const categoryDocs = await Category.find({ slug: { $in: neededSlugs } });
  const categoryBySlug = new Map(categoryDocs.map((c) => [c.slug, c]));
  const missing = neededSlugs.filter((slug) => !categoryBySlug.has(slug));
  if (missing.length > 0) {
    console.error(`✗ Missing categories in DB: ${missing.join(", ")}`);
    process.exit(1);
  }

  console.log("→ Creating 10 users…");
  const userDocs = await User.insertMany(
    IN10_USERS.map((user, index) => ({
      googleId: `${GOOGLE_ID_PREFIX}${user.username}`,
      email: user.email,
      emailVerified: true,
      name: user.name,
      username: user.username,
      bio: user.bio,
      role: "user" as const,
      reputation: user.reputation,
      problemCredits: 3,
      status: "active" as const,
      createdAt: daysAgo(30 - index * 2),
    }))
  );
  const userByUsername = new Map(userDocs.map((u) => [u.username, u]));

  console.log("→ Creating 12 problems…");
  const existingSlugs = await Problem.find({}, { slug: 1 }).lean();
  const takenSlugs = new Set(existingSlugs.map((p) => p.slug));

  const problemInserts = IN10_PROBLEMS.map((seed) => {
    const author = userByUsername.get(seed.author)!;
    const category = categoryBySlug.get(seed.category)!;
    const slug = nextAvailableSlug(slugify(seed.title), takenSlugs);
    takenSlugs.add(slug);
    const createdAt = daysAgo(seed.daysAgo);
    return {
      authorId: author._id,
      title: seed.title,
      slug,
      description: seed.description,
      categoryId: category._id,
      location: seed.location ?? { scope: "global" as const },
      images: [],
      isAnonymous: false,
      status: seed.status ?? ("open" as const),
      moderationStatus: "approved" as const,
      moderation: { provider: "seed-in10", score: 0, labels: [] },
      validationCount: 0,
      bookmarkCount: 0,
      commentCount: 0,
      solutionCount: 0,
      hotScore: 0,
      createdAt,
      updatedAt: createdAt,
    };
  });
  const problems = await Problem.insertMany(problemInserts);

  console.log("→ Creating comment threads…");
  const commentCountByProblem = new Map<number, number>();
  const rootByProblem = new Map<number, mongoose.Types.ObjectId>();

  for (const seed of IN10_COMMENTS) {
    const problem = problems[seed.problem];
    const author = userByUsername.get(seed.author)!;
    const isRoot = !rootByProblem.has(seed.problem);
    const createdAt = daysAgo(IN10_PROBLEMS[seed.problem].daysAgo - 1 - Math.random());

    const comment = await Comment.create({
      problemId: problem._id,
      solutionId: null,
      parentId: isRoot ? null : rootByProblem.get(seed.problem),
      authorId: author._id,
      content: seed.content,
      isAnonymous: false,
      status: "visible",
      moderationStatus: "approved",
      moderation: { provider: "seed-in10", score: 0, labels: [] },
      helpfulCount: 0,
      awardCount: 0,
      replyCount: 0,
      createdAt,
      updatedAt: createdAt,
    });

    if (isRoot) rootByProblem.set(seed.problem, comment._id);
    commentCountByProblem.set(
      seed.problem,
      (commentCountByProblem.get(seed.problem) ?? 0) + 1
    );
  }

  // replyCount on each root = number of comments in its thread minus the root itself.
  await Promise.all(
    [...rootByProblem.entries()].map(([problemIndex, rootId]) =>
      Comment.updateOne(
        { _id: rootId },
        {
          $set: {
            replyCount: (commentCountByProblem.get(problemIndex) ?? 1) - 1,
          },
        }
      )
    )
  );

  console.log("→ Creating bookmarks…");
  const bookmarkCountByProblem = new Map<number, number>();
  await ProblemBookmark.insertMany(
    IN10_BOOKMARKS.map((b) => {
      bookmarkCountByProblem.set(
        b.problem,
        (bookmarkCountByProblem.get(b.problem) ?? 0) + 1
      );
      return {
        problemId: problems[b.problem]._id,
        userId: userByUsername.get(b.user)!._id,
        createdAt: daysAgo(Math.max(1, IN10_PROBLEMS[b.problem].daysAgo - 1)),
      };
    })
  );

  console.log("→ Reconciling problem counters and hot scores…");
  for (const [index, problem] of problems.entries()) {
    const counts = {
      commentCount: commentCountByProblem.get(index) ?? 0,
      bookmarkCount: bookmarkCountByProblem.get(index) ?? 0,
      solutionCount: 0,
      validationCount: 0,
    };
    await Problem.updateOne(
      { _id: problem._id },
      {
        $set: {
          ...counts,
          hotScore: computeHotScore(problemSignal(counts), problem.createdAt),
        },
      }
    );
  }

  console.log("→ Incrementing category problem counts…");
  const categoryDeltas = new Map<string, number>();
  for (const seed of IN10_PROBLEMS) {
    const id = String(categoryBySlug.get(seed.category)!._id);
    categoryDeltas.set(id, (categoryDeltas.get(id) ?? 0) + 1);
  }
  await Promise.all(
    [...categoryDeltas.entries()].map(([id, delta]) =>
      Category.updateOne({ _id: id }, { $inc: { problemCount: delta } })
    )
  );

  console.log("→ Reconciling user stats…");
  for (const user of userDocs) {
    const [problemCount, commentCount] = await Promise.all([
      Problem.countDocuments({ authorId: user._id }),
      Comment.countDocuments({ authorId: user._id }),
    ]);
    await User.updateOne(
      { _id: user._id },
      { $set: { "stats.problems": problemCount, "stats.comments": commentCount } }
    );
  }

  console.log("\n✓ seed-in10 complete");
  console.log(`  ${userDocs.length} users (googleId prefix "${GOOGLE_ID_PREFIX}")`);
  console.log(`  ${problems.length} problems`);
  console.log(`  ${IN10_COMMENTS.length} comments/replies`);
  console.log(`  ${IN10_BOOKMARKS.length} bookmarks`);
  console.log("\n  To remove all of this later: npx tsx scripts/undo-seed-in10.ts\n");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("\n✗ seed-in10 failed:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
