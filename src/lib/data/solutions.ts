import "server-only";
import type { QueryFilter, SortOrder } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Solution, SolutionVote, type ISolution } from "@/models";
import { getCurrentUser } from "@/lib/auth/current-user";
import { toObjectId } from "@/lib/utils/sanitize-query";
import { PAGE_SIZE, type SolutionSort } from "@/lib/constants";
import type { Paginated, SolutionDTO } from "@/types";
import { AUTHOR_FIELDS, toSolutionDTO } from "./serialize";

const SORT_SPECS: Record<SolutionSort, Record<string, SortOrder>> = {
  helpful: { helpfulCount: -1, createdAt: -1 },
  newest: { createdAt: -1 },
  trending: { hotScore: -1, _id: -1 },
};

async function votedIdsFor(
  viewerId: string | null | undefined,
  solutionIds: string[]
): Promise<Set<string>> {
  if (!viewerId || solutionIds.length === 0) return new Set();
  const userId = toObjectId(viewerId);
  if (!userId) return new Set();

  const rows = await SolutionVote.find(
    { userId, solutionId: { $in: solutionIds.map(toObjectId).filter(Boolean) } },
    { solutionId: 1 }
  )
    .lean()
    .exec();

  return new Set(rows.map((r) => String(r.solutionId)));
}

export async function listSolutionsForProblem(
  problemId: string,
  options: { sort?: SolutionSort; acceptedSolutionId?: string | null } = {}
): Promise<SolutionDTO[]> {
  await connectToDatabase();
  const viewer = await getCurrentUser();

  const id = toObjectId(problemId);
  if (!id) return [];

  const filter: QueryFilter<ISolution> = { problemId: id };
  // Authors and moderators additionally see pending items so nothing silently
  // disappears after posting.
  filter.$or = [
    { moderationStatus: "approved" },
    ...(viewer?.isModerator ? [{ moderationStatus: "pending" as const }] : []),
    ...(viewer
      ? [{ authorId: toObjectId(viewer.id), moderationStatus: { $ne: "removed" as const } }]
      : []),
  ];

  const docs = await Solution.find(filter)
    .sort(SORT_SPECS[options.sort ?? "helpful"])
    .limit(100)
    .populate("authorId", AUTHOR_FIELDS)
    .lean<ISolution[]>()
    .exec();

  const votedIds = await votedIdsFor(
    viewer?.id,
    docs.map((d) => String(d._id))
  );

  const dtos = docs.map((doc) =>
    toSolutionDTO(doc, {
      viewerId: viewer?.id ?? null,
      votedIds,
      acceptedSolutionId: options.acceptedSolutionId ?? null,
    })
  );

  // An accepted solution always leads, regardless of the chosen sort.
  return dtos.sort((a, b) => Number(b.isAccepted) - Number(a.isAccepted));
}

export async function getSolutionById(
  solutionId: string
): Promise<SolutionDTO | null> {
  await connectToDatabase();
  const viewer = await getCurrentUser();

  const id = toObjectId(solutionId);
  if (!id) return null;

  const doc = await Solution.findById(id)
    .populate("authorId", AUTHOR_FIELDS)
    .populate("problemId", "slug title acceptedSolutionId")
    .lean<ISolution>()
    .exec();

  if (!doc) return null;

  const votedIds = await votedIdsFor(viewer?.id, [String(doc._id)]);
  return toSolutionDTO(doc, { viewerId: viewer?.id ?? null, votedIds });
}

export async function listTopSolutions(
  options: { limit?: number; page?: number; sort?: SolutionSort } = {}
): Promise<Paginated<SolutionDTO>> {
  await connectToDatabase();
  const viewer = await getCurrentUser();

  const page = Math.max(1, options.page ?? 1);
  const pageSize = options.limit ?? PAGE_SIZE;
  const filter: QueryFilter<ISolution> = { moderationStatus: "approved" };

  const [docs, total] = await Promise.all([
    Solution.find(filter)
      .sort(SORT_SPECS[options.sort ?? "helpful"])
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("authorId", AUTHOR_FIELDS)
      .populate("problemId", "slug title moderationStatus")
      .lean<ISolution[]>()
      .exec(),
    Solution.countDocuments(filter).exec(),
  ]);

  const visible = docs.filter((d) => {
    const problem = d.problemId as unknown as { moderationStatus?: string };
    return !problem?.moderationStatus || problem.moderationStatus === "approved";
  });

  const votedIds = await votedIdsFor(
    viewer?.id,
    visible.map((d) => String(d._id))
  );

  return {
    items: visible.map((doc) =>
      toSolutionDTO(doc, { viewerId: viewer?.id ?? null, votedIds })
    ),
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listSolutionsByAuthor(
  authorId: string,
  options: { page?: number; pageSize?: number } = {}
): Promise<Paginated<SolutionDTO>> {
  await connectToDatabase();
  const viewer = await getCurrentUser();

  const userId = toObjectId(authorId);
  if (!userId) {
    return { items: [], total: 0, page: 1, pageSize: 0, hasMore: false, totalPages: 1 };
  }

  const page = Math.max(1, options.page ?? 1);
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const filter: QueryFilter<ISolution> = {
    authorId: userId,
    moderationStatus: "approved",
    isAnonymous: false,
  };

  const [docs, total] = await Promise.all([
    Solution.find(filter)
      .sort({ helpfulCount: -1, createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("authorId", AUTHOR_FIELDS)
      .populate("problemId", "slug title")
      .lean<ISolution[]>()
      .exec(),
    Solution.countDocuments(filter).exec(),
  ]);

  const votedIds = await votedIdsFor(
    viewer?.id,
    docs.map((d) => String(d._id))
  );

  return {
    items: docs.map((doc) =>
      toSolutionDTO(doc, { viewerId: viewer?.id ?? null, votedIds })
    ),
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
