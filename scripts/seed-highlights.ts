/**
 * Adds five genuine, well-known problems — spanning health, housing, work,
 * finance and society — along with their existing comment threads and a
 * modest, honestly-backed set of validations (each headline count equals the
 * number of real ProblemValidation rows created, never a number pulled out
 * of thin air).
 *
 * Purely additive: never deletes anything, and is safe to re-run (already
 * present titles are skipped).
 *
 * Run with: npx tsx scripts/seed-highlights.ts
 */
import { config } from "dotenv";
import mongoose from "mongoose";
import {
  Category,
  Comment,
  Problem,
  ProblemValidation,
  User,
  computeHotScore,
  problemSignal,
  type ICategory,
  type IProblem,
  type IUser,
} from "../src/models";
import type { HydratedDocument } from "mongoose";
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

const HIGHLIGHT_TITLES = [
  "Getting a same-week appointment with a GP is nearly impossible",
  "Finding trustworthy roommates is genuinely risky",
  "Job listings hide salary, wasting everyone's time",
  "Gig workers cannot get a loan because their income looks unstable",
  "Elderly relatives get locked out of services that went app-only",
];

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

  const meta = SEED_CATEGORIES.find((c) => c.slug === slug);
  if (!meta) throw new Error(`Unknown category slug "${slug}"`);

  const created = await Category.create({
    ...meta,
    status: "approved",
    order: SEED_CATEGORIES.findIndex((c) => c.slug === slug),
    problemCount: 0,
  });
  console.log(`→ Created category "${meta.name}"`);
  return created;
}

async function ensureUser(username: string): Promise<HydratedDocument<IUser>> {
  const existing = await User.findOne({ username }).exec();
  if (existing) return existing;

  const meta = SEED_USERS.find((u) => u.username === username);
  if (!meta) throw new Error(`Unknown seed username "${username}"`);

  const created = await User.create({
    googleId: `seed-google-${username}`,
    email: meta.email,
    emailVerified: true,
    name: meta.name,
    username: meta.username,
    bio: meta.bio,
    role: meta.role ?? "user",
    reputation: meta.reputation,
    problemCredits: 3,
    status: "active",
    createdAt: daysAgo(120),
  });
  console.log(`→ Created user @${username}`);
  return created;
}

async function main() {
  console.log(`→ Connecting to ${MONGODB_DB}…`);
  await mongoose.connect(MONGODB_URI!, { dbName: MONGODB_DB });

  const candidates = SEED_PROBLEMS.filter((p) => HIGHLIGHT_TITLES.includes(p.title));
  if (candidates.length !== HIGHLIGHT_TITLES.length) {
    throw new Error("Some highlight titles are missing from SEED_PROBLEMS.");
  }

  const existingTitles = new Set(
    (
      await Problem.find({ title: { $in: HIGHLIGHT_TITLES } }, { title: 1 }).lean().exec()
    ).map((p) => p.title)
  );
  const toCreate = candidates.filter((p) => !existingTitles.has(p.title));

  if (existingTitles.size > 0) {
    console.log(`→ Skipping ${existingTitles.size} already-seeded problem(s).`);
  }
  if (toCreate.length === 0) {
    console.log("All five highlight problems already exist. Nothing to do.");
    await mongoose.disconnect();
    return;
  }

  // --- Categories ----------------------------------------------------
  const neededSlugs = [...new Set(toCreate.map((p) => p.category))];
  const categoryBySlug = new Map<string, HydratedDocument<ICategory>>();
  for (const slug of neededSlugs) {
    categoryBySlug.set(slug, await ensureCategory(slug));
  }

  // --- Users -----------------------------------------------------------
  const neededUsernames = new Set<string>();
  for (const p of toCreate) {
    neededUsernames.add(p.author);
    for (const c of SEED_COMMENTS.filter((c) => c.problemTitle === p.title)) {
      neededUsernames.add(c.author);
      for (const r of c.replies ?? []) neededUsernames.add(r.author);
    }
  }
  // A few extra voters beyond the people already involved, so a validation
  // count is never capped at "everyone who happened to comment".
  for (const username of sample(SEED_USERS.map((u) => u.username), 5)) {
    neededUsernames.add(username);
  }

  const userByUsername = new Map<string, HydratedDocument<IUser>>();
  for (const username of neededUsernames) {
    userByUsername.set(username, await ensureUser(username));
  }

  // --- Problems ----------------------------------------------------------
  const existingSlugs = new Set(
    (await Problem.find({}, { slug: 1 }).lean().exec()).map((p) => p.slug)
  );

  const created: Array<{
    doc: HydratedDocument<IProblem>;
    seed: (typeof toCreate)[number];
  }> = [];

  for (const seed of toCreate) {
    const author = userByUsername.get(seed.author)!;
    const category = categoryBySlug.get(seed.category)!;
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
      isAnonymous: seed.isAnonymous ?? false,
      status: seed.status ?? "open",
      moderationStatus: "approved",
      moderation: { provider: "seed", score: 0, labels: [] },
      validationCount: 0,
      commentCount: 0,
      solutionCount: 0,
      hotScore: 0,
      createdAt,
      updatedAt: createdAt,
    });
    created.push({ doc, seed });
    console.log(`→ Created problem "${seed.title}"`);
  }

  // --- Validations: real rows, headline count equals the row count -----
  const voterPool = [...userByUsername.values()];
  let validationTotal = 0;
  for (const { doc, seed } of created) {
    const voters = sample(
      voterPool.filter((u) => String(u._id) !== String(doc.authorId)),
      Math.min(voterPool.length, 4 + Math.floor(Math.random() * 5)) // 4-8 voters
    );
    if (voters.length > 0) {
      await ProblemValidation.insertMany(
        voters.map((u) => ({
          problemId: doc._id,
          userId: u._id,
          createdAt: daysAgo(Math.random() * seed.daysAgo),
        })),
        { ordered: false }
      );
    }
    doc.validationCount = voters.length;
    validationTotal += voters.length;
  }

  // --- Comments (+ replies), reused verbatim from the shared fixtures ----
  let commentTotal = 0;
  for (const { doc, seed } of created) {
    let count = 0;
    for (const c of SEED_COMMENTS.filter((c) => c.problemTitle === seed.title)) {
      const author = userByUsername.get(c.author)!;
      const createdAt = daysAgo(c.daysAgo);
      const root = await Comment.create({
        problemId: doc._id,
        solutionId: null,
        parentId: null,
        authorId: author._id,
        content: c.content,
        isAnonymous: false,
        status: "visible",
        moderationStatus: "approved",
        moderation: { provider: "seed", score: 0, labels: [] },
        helpfulCount: c.helpful,
        replyCount: c.replies?.length ?? 0,
        createdAt,
        updatedAt: createdAt,
      });
      count += 1;

      for (const r of c.replies ?? []) {
        const replyAuthor = userByUsername.get(r.author)!;
        const replyAt = daysAgo(r.daysAgo);
        await Comment.create({
          problemId: doc._id,
          solutionId: null,
          parentId: root._id,
          authorId: replyAuthor._id,
          content: r.content,
          isAnonymous: false,
          status: "visible",
          moderationStatus: "approved",
          moderation: { provider: "seed", score: 0, labels: [] },
          helpfulCount: r.helpful,
          createdAt: replyAt,
          updatedAt: replyAt,
        });
        count += 1;
      }
    }
    doc.commentCount = count;
    commentTotal += count;
  }

  // --- Persist counts + hot score -----------------------------------
  for (const { doc } of created) {
    const counts = {
      validationCount: doc.validationCount,
      solutionCount: doc.solutionCount,
      commentCount: doc.commentCount,
    };
    await Problem.updateOne(
      { _id: doc._id },
      {
        $set: {
          ...counts,
          hotScore: computeHotScore(problemSignal(counts), doc.createdAt),
        },
      }
    );
  }

  // --- Reconcile category + user stats ---------------------------------
  for (const slug of neededSlugs) {
    const category = categoryBySlug.get(slug)!;
    const count = await Problem.countDocuments({
      categoryId: category._id,
      moderationStatus: "approved",
    });
    await Category.updateOne({ _id: category._id }, { $set: { problemCount: count } });
  }

  for (const user of userByUsername.values()) {
    const [problemCount, commentCount, authoredProblems] = await Promise.all([
      Problem.countDocuments({ authorId: user._id, moderationStatus: "approved" }),
      Comment.countDocuments({ authorId: user._id, moderationStatus: "approved" }),
      Problem.find({ authorId: user._id }, { validationCount: 1 }).lean().exec(),
    ]);
    const validationsReceived = authoredProblems.reduce(
      (sum, p) => sum + (p.validationCount ?? 0),
      0
    );
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          "stats.problems": problemCount,
          "stats.comments": commentCount,
          "stats.validationsReceived": validationsReceived,
        },
      }
    );
  }

  console.log(
    `\n✓ Added ${created.length} problems, ${commentTotal} comments, ${validationTotal} validations.\n`
  );
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("\n✗ Failed:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
