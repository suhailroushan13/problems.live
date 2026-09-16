import "server-only";
import type { QueryFilter, SortOrder } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  Category,
  Problem,
  ProblemBookmark,
  ProblemValidation,
  type IProblem,
} from "@/models";
import { getCurrentUser } from "@/lib/auth/current-user";
import { toObjectId } from "@/lib/utils/sanitize-query";
import { PAGE_SIZE, type ProblemSort } from "@/lib/constants";
import type { Paginated, ProblemDTO } from "@/types";
import { AUTHOR_FIELDS, CATEGORY_FIELDS, toProblemDTO } from "./serialize";
import type { ProblemFilters } from "@/lib/validation/schemas";

/** Only approved content is ever visible in public feeds. */
const PUBLIC_FILTER: QueryFilter<IProblem> = { moderationStatus: "approved" };

const SORT_SPECS: Record<ProblemSort, Record<string, SortOrder>> = {
  validated: { validationCount: -1, createdAt: -1 },
  clicks: { viewCount: -1, createdAt: -1 },
  trending: { hotScore: -1, _id: -1 },
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  discussed: { commentCount: -1, createdAt: -1 },
  solutions: { solutionCount: -1, createdAt: -1 },
};

/**
 * Which of this page's problems has the viewer already validated? One indexed
 * query for the whole page rather than one per card.
 */
export async function validatedIdsFor(
  viewerId: string | null | undefined,
  problemIds: string[],
): Promise<Set<string>> {
  if (!viewerId || problemIds.length === 0) return new Set();

  const userId = toObjectId(viewerId);
  if (!userId) return new Set();

  const rows = await ProblemValidation.find(
    { userId, problemId: { $in: problemIds.map(toObjectId).filter(Boolean) } },
    { problemId: 1 },
  )
    .lean()
    .exec();

  return new Set(rows.map((r) => String(r.problemId)));
}

/** One indexed query for the viewer's bookmarks across a complete card list. */
async function bookmarkedIdsFor(
  viewerId: string | null | undefined,
  problemIds: string[],
): Promise<Set<string>> {
  if (!viewerId || problemIds.length === 0) return new Set();

  const userId = toObjectId(viewerId);
  if (!userId) return new Set();

  const rows = await ProblemBookmark.find(
    { userId, problemId: { $in: problemIds.map(toObjectId).filter(Boolean) } },
    { problemId: 1 },
  )
    .lean()
    .exec();

  return new Set(rows.map((row) => String(row.problemId)));
}

/** Private history of problems a user has supported with "I have this too". */
export async function listValidatedProblemsByUser(userId: string): Promise<ProblemDTO[]> {
  await connectToDatabase();
  const voterId = toObjectId(userId);
  if (!voterId) return [];

  const validations = await ProblemValidation.find({ userId: voterId }, { problemId: 1 })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()
    .exec();
  if (validations.length === 0) return [];

  const order = new Map(validations.map((vote, index) => [String(vote.problemId), index]));
  const docs = await Problem.find({
    _id: { $in: validations.map((vote) => vote.problemId) },
    ...PUBLIC_FILTER,
  })
    .populate("authorId", AUTHOR_FIELDS)
    .populate("categoryId", CATEGORY_FIELDS)
    .lean<IProblem[]>()
    .exec();

  const items = await decorate(docs, userId);
  return items.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

async function decorate(
  docs: IProblem[],
  viewerId: string | null,
): Promise<ProblemDTO[]> {
  const problemIds = docs.map((doc) => String(doc._id));
  const [validatedIds, bookmarkedIds] = await Promise.all([
    validatedIdsFor(viewerId, problemIds),
    bookmarkedIdsFor(viewerId, problemIds),
  ]);
  return docs.map((doc) =>
    toProblemDTO(doc, { viewerId, validatedIds, bookmarkedIds })
  );
}

export async function buildProblemFilter(
  filters: Partial<ProblemFilters>,
): Promise<QueryFilter<IProblem>> {
  const filter: QueryFilter<IProblem> = { ...PUBLIC_FILTER };

  if (filters.category) {
    const category = await Category.findOne(
      { slug: String(filters.category).toLowerCase() },
      { _id: 1 },
    )
      .lean()
      .exec();
    // An unknown category must return nothing rather than everything.
    filter.categoryId = category?._id ?? toObjectId("000000000000000000000000");
  }

  if (filters.status) filter.status = filters.status;
  if (filters.scope) filter["location.scope"] = filters.scope;
  if (filters.country) filter["location.country"] = filters.country;
  if (filters.q) filter.$text = { $search: filters.q };

  return filter;
}

export async function listProblems(
  filters: Partial<ProblemFilters> & { pageSize?: number },
): Promise<Paginated<ProblemDTO>> {
  await connectToDatabase();
  const viewer = await getCurrentUser();

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? PAGE_SIZE;
  const sort = filters.sort ?? "validated";
  const filter = await buildProblemFilter(filters);

  // Free-text search ranks by relevance; everything else uses an index-backed
  // sort on the matching compound index.
  const sortSpec = filters.q
    ? ({ score: { $meta: "textScore" } } as Record<string, unknown>)
    : SORT_SPECS[sort];

  const projection = filters.q ? { score: { $meta: "textScore" } } : {};

  const [docs, total] = await Promise.all([
    Problem.find(filter, projection)
      .sort(sortSpec as Record<string, SortOrder>)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("authorId", AUTHOR_FIELDS)
      .populate("categoryId", CATEGORY_FIELDS)
      .lean<IProblem[]>()
      .exec(),
    Problem.countDocuments(filter).exec(),
  ]);

  const items = await decorate(docs, viewer?.id ?? null);

  return {
    items,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getProblemBySlug(
  slug: string,
): Promise<ProblemDTO | null> {
  await connectToDatabase();
  const viewer = await getCurrentUser();

  const doc = await Problem.findOne({ slug: String(slug).toLowerCase() })
    .populate("authorId", AUTHOR_FIELDS)
    .populate("categoryId", CATEGORY_FIELDS)
    .lean<IProblem>()
    .exec();

  if (!doc) return null;

  // Held or removed problems stay visible to their author and to moderators,
  // so people can see why something is not public yet.
  const isOwner =
    viewer && String(doc.authorId?._id ?? doc.authorId) === viewer.id;
  if (doc.moderationStatus !== "approved" && !isOwner && !viewer?.isModerator) {
    return null;
  }

  const [dto] = await decorate([doc], viewer?.id ?? null);
  return dto;
}

export async function getProblemIdBySlug(slug: string): Promise<string | null> {
  await connectToDatabase();
  const doc = await Problem.findOne(
    { slug: String(slug).toLowerCase() },
    { _id: 1 },
  )
    .lean()
    .exec();
  return doc ? String(doc._id) : null;
}

export async function listTrendingProblems(limit = 6): Promise<ProblemDTO[]> {
  const { items } = await listProblems({ sort: "trending", pageSize: limit });
  return items;
}

export async function listMostValidatedProblems(
  limit = 6,
): Promise<ProblemDTO[]> {
  const { items } = await listProblems({ sort: "validated", pageSize: limit });
  return items;
}

export async function listRecentProblems(limit = 6): Promise<ProblemDTO[]> {
  const { items } = await listProblems({ sort: "newest", pageSize: limit });
  return items;
}

export async function listProblemsByAuthor(
  authorId: string,
  options: {
    page?: number;
    pageSize?: number;
    includeAnonymous?: boolean;
  } = {},
): Promise<Paginated<ProblemDTO>> {
  await connectToDatabase();
  const viewer = await getCurrentUser();

  const userId = toObjectId(authorId);
  if (!userId) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: 0,
      hasMore: false,
      totalPages: 1,
    };
  }

  const page = Math.max(1, options.page ?? 1);
  const pageSize = options.pageSize ?? PAGE_SIZE;

  const filter: QueryFilter<IProblem> = {
    authorId: userId,
    moderationStatus: "approved",
  };
  // A public profile must never reveal that someone posted anonymously.
  if (!options.includeAnonymous) filter.isAnonymous = false;

  const [docs, total] = await Promise.all([
    Problem.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("authorId", AUTHOR_FIELDS)
      .populate("categoryId", CATEGORY_FIELDS)
      .lean<IProblem[]>()
      .exec(),
    Problem.countDocuments(filter).exec(),
  ]);

  return {
    items: await decorate(docs, viewer?.id ?? null),
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Problems the signed-in user has personally validated. */
export async function listValidatedByUser(
  userId: string,
  limit = 20,
): Promise<ProblemDTO[]> {
  await connectToDatabase();
  const viewer = await getCurrentUser();

  const objectId = toObjectId(userId);
  if (!objectId) return [];

  const validations = await ProblemValidation.find(
    { userId: objectId },
    { problemId: 1 },
  )
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
    .exec();

  if (validations.length === 0) return [];

  const docs = await Problem.find({
    _id: { $in: validations.map((v) => v.problemId) },
    moderationStatus: "approved",
  })
    .populate("authorId", AUTHOR_FIELDS)
    .populate("categoryId", CATEGORY_FIELDS)
    .lean<IProblem[]>()
    .exec();

  // Preserve "most recently validated first" ordering.
  const order = new Map(
    validations.map((v, index) => [String(v.problemId), index]),
  );
  docs.sort(
    (a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0),
  );

  return decorate(docs, viewer?.id ?? null);
}

/**
 * A user's saved problems. This query is intentionally private: callers can
 * only receive their own bookmarks, ordered by when they saved them.
 */
export async function listBookmarkedByUser(
  userId: string,
  limit = 100,
): Promise<ProblemDTO[]> {
  await connectToDatabase();
  const viewer = await getCurrentUser();
  if (!viewer || viewer.id !== userId) return [];

  const objectId = toObjectId(userId);
  if (!objectId) return [];

  const bookmarks = await ProblemBookmark.find(
    { userId: objectId },
    { problemId: 1 },
  )
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
    .exec();
  if (bookmarks.length === 0) return [];

  const docs = await Problem.find({
    _id: { $in: bookmarks.map((bookmark) => bookmark.problemId) },
    moderationStatus: "approved",
  })
    .populate("authorId", AUTHOR_FIELDS)
    .populate("categoryId", CATEGORY_FIELDS)
    .lean<IProblem[]>()
    .exec();

  const order = new Map(
    bookmarks.map((bookmark, index) => [String(bookmark.problemId), index]),
  );
  docs.sort(
    (a, b) =>
      (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0),
  );

  return decorate(docs, viewer.id);
}

export async function listAllProblemSlugs(
  limit = 5000,
): Promise<Array<{ slug: string; updatedAt: Date }>> {
  await connectToDatabase();
  const docs = await Problem.find(
    { moderationStatus: "approved" },
    { slug: 1, updatedAt: 1 },
  )
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
    .exec();
  return docs.map((d) => ({ slug: d.slug, updatedAt: d.updatedAt }));
}
