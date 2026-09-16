/**
 * One-off, non-destructive migration to the new category taxonomy.
 * Renames categories in place (keeping their _id, so existing problems'
 * categoryId references stay valid), inserts the new "Community" category,
 * and reassigns problems from the two dropped categories before deleting
 * them. Safe to re-run — every step is idempotent.
 *
 * Run with: npx tsx scripts/migrate-categories.ts
 */
import { config } from "dotenv";
import mongoose from "mongoose";
import { Category, Problem } from "../src/models";
import { SEED_CATEGORIES } from "../src/lib/constants";

config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "problems_live";

const RENAMES: Record<string, { name: string; slug: string; icon: string; description: string }> = {
  finance: SEED_CATEGORIES.find((c) => c.slug === "money")!,
  society: SEED_CATEGORIES.find((c) => c.slug === "government")!,
};

const DROPPED: Record<string, string> = {
  travel: "government",
  "local-problems": "community",
};

async function main() {
  if (!MONGODB_URI) throw new Error("MONGODB_URI is not set.");
  console.log(`→ Connecting to ${MONGODB_DB}…`);
  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB });

  for (const [oldSlug, target] of Object.entries(RENAMES)) {
    const result = await Category.updateOne(
      { slug: oldSlug },
      { $set: { name: target.name, slug: target.slug, icon: target.icon, description: target.description } }
    );
    console.log(`→ Renamed "${oldSlug}" → "${target.slug}" (matched ${result.matchedCount})`);
  }

  const communitySeed = SEED_CATEGORIES.find((c) => c.slug === "community")!;
  const communityDoc = await Category.findOneAndUpdate(
    { slug: "community" },
    {
      $setOnInsert: {
        ...communitySeed,
        status: "approved",
        problemCount: 0,
      },
    },
    { upsert: true, new: true }
  );
  console.log(`→ Ensured "community" category exists (${communityDoc._id})`);

  for (const [droppedSlug, replacementSlug] of Object.entries(DROPPED)) {
    const dropped = await Category.findOne({ slug: droppedSlug });
    if (!dropped) {
      console.log(`→ "${droppedSlug}" not found, nothing to drop.`);
      continue;
    }
    const replacement = await Category.findOne({ slug: replacementSlug });
    if (!replacement) throw new Error(`Replacement category "${replacementSlug}" not found.`);

    const moved = await Problem.updateMany(
      { categoryId: dropped._id },
      { $set: { categoryId: replacement._id } }
    );
    console.log(`→ Moved ${moved.modifiedCount} problem(s) from "${droppedSlug}" to "${replacementSlug}"`);

    await Category.deleteOne({ _id: dropped._id });
    console.log(`→ Deleted category "${droppedSlug}"`);
  }

  console.log("→ Ensuring every category in the new taxonomy exists…");
  for (const category of SEED_CATEGORIES) {
    const result = await Category.updateOne(
      { slug: category.slug },
      { $setOnInsert: { ...category, status: "approved", problemCount: 0 } },
      { upsert: true }
    );
    if (result.upsertedCount > 0) console.log(`  + Created "${category.slug}"`);
  }

  console.log("→ Setting display order…");
  for (const [index, category] of SEED_CATEGORIES.entries()) {
    await Category.updateOne({ slug: category.slug }, { $set: { order: index } });
  }

  console.log("→ Reconciling category counts…");
  const categories = await Category.find({ status: "approved" });
  for (const category of categories) {
    const count = await Problem.countDocuments({
      categoryId: category._id,
      moderationStatus: "approved",
    });
    await Category.updateOne({ _id: category._id }, { $set: { problemCount: count } });
  }

  const final = await Category.find({}, { name: 1, slug: 1, order: 1, problemCount: 1 })
    .sort({ order: 1 })
    .lean();
  console.log("→ Final category list:");
  console.table(final.map((c) => ({ name: c.name, slug: c.slug, order: c.order, problemCount: c.problemCount })));

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
