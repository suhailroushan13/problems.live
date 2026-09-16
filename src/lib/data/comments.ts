import "server-only";
import type { QueryFilter } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Comment, CommentAward, CommentVote, type IComment } from "@/models";
import { getCurrentUser } from "@/lib/auth/current-user";
import { toObjectId } from "@/lib/utils/sanitize-query";
import { COMMENT_PAGE_SIZE } from "@/lib/constants";
import type { CommentDTO } from "@/types";
import { AUTHOR_FIELDS, toCommentDTO } from "./serialize";

async function voteDirectionsFor(
  viewerId: string | null | undefined,
  commentIds: string[]
): Promise<Map<string, "up" | "down">> {
  if (!viewerId || commentIds.length === 0) return new Map();
  const userId = toObjectId(viewerId);
  if (!userId) return new Map();

  const rows = await CommentVote.find(
    { userId, commentId: { $in: commentIds.map(toObjectId).filter(Boolean) } },
    { commentId: 1, direction: 1 }
  )
    .lean()
    .exec();

  return new Map(rows.map((r) => [String(r.commentId), r.direction]));
}

async function awardedIdsFor(
  viewerId: string | null | undefined,
  commentIds: string[]
): Promise<Set<string>> {
  if (!viewerId || commentIds.length === 0) return new Set();
  const userId = toObjectId(viewerId);
  if (!userId) return new Set();

  const rows = await CommentAward.find(
    { userId, commentId: { $in: commentIds.map(toObjectId).filter(Boolean) } },
    { commentId: 1 }
  )
    .lean()
    .exec();

  return new Set(rows.map((r) => String(r.commentId)));
}

/**
 * Two-level threading: top-level comments plus their replies. Deeper nesting
 * is what turns discussion into visual clutter, so replies to replies are
 * flattened onto the same parent.
 */
export async function listCommentsForProblem(
  problemId: string,
  options: { solutionId?: string | null; limit?: number } = {}
): Promise<CommentDTO[]> {
  await connectToDatabase();
  const viewer = await getCurrentUser();

  const id = toObjectId(problemId);
  if (!id) return [];

  const visibility: QueryFilter<IComment>["$or"] = [
    { moderationStatus: "approved" },
    ...(viewer?.isModerator ? [{ moderationStatus: "pending" as const }] : []),
    ...(viewer
      ? [
          {
            authorId: toObjectId(viewer.id),
            moderationStatus: { $ne: "removed" as const },
          },
        ]
      : []),
  ];

  const roots = await Comment.find({
    problemId: id,
    solutionId: options.solutionId ? toObjectId(options.solutionId) : null,
    parentId: null,
    $or: visibility,
  })
    .sort({ helpfulCount: -1, createdAt: -1 })
    .limit(options.limit ?? COMMENT_PAGE_SIZE)
    .populate("authorId", AUTHOR_FIELDS)
    .lean<IComment[]>()
    .exec();

  if (roots.length === 0) return [];

  const rootIds = roots.map((r) => r._id);
  const replies = await Comment.find({
    parentId: { $in: rootIds },
    $or: visibility,
  })
    .sort({ createdAt: 1 })
    .limit(500)
    .populate("authorId", AUTHOR_FIELDS)
    .lean<IComment[]>()
    .exec();

  const allIds = [
    ...roots.map((r) => String(r._id)),
    ...replies.map((r) => String(r._id)),
  ];
  const [voteDirections, awardedIds] = await Promise.all([
    voteDirectionsFor(viewer?.id, allIds),
    awardedIdsFor(viewer?.id, allIds),
  ]);

  const ctx = { viewerId: viewer?.id ?? null, voteDirections, awardedIds };
  const byParent = new Map<string, CommentDTO[]>();
  for (const reply of replies) {
    const key = String(reply.parentId);
    const list = byParent.get(key) ?? [];
    list.push(toCommentDTO(reply, ctx));
    byParent.set(key, list);
  }

  return roots
    .map((root) => {
      const dto = toCommentDTO(root, ctx);
      dto.replies = byParent.get(dto.id) ?? [];
      return dto;
    })
    // A deleted root with no surviving replies adds nothing to the page.
    .filter((c) => !c.isDeleted || c.replies.length > 0);
}

export async function countCommentsForProblem(
  problemId: string
): Promise<number> {
  await connectToDatabase();
  const id = toObjectId(problemId);
  if (!id) return 0;
  return Comment.countDocuments({
    problemId: id,
    moderationStatus: "approved",
    status: "visible",
  }).exec();
}

export async function listRecentCommentsByAuthor(
  authorId: string,
  limit = 20
): Promise<
  Array<{
    id: string;
    content: string;
    createdAt: string;
    helpfulCount: number;
    problem: { slug: string; title: string } | null;
  }>
> {
  await connectToDatabase();
  const userId = toObjectId(authorId);
  if (!userId) return [];

  const docs = await Comment.find({
    authorId: userId,
    moderationStatus: "approved",
    status: "visible",
    isAnonymous: false,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("problemId", "slug title moderationStatus")
    .lean<IComment[]>()
    .exec();

  return docs
    .map((doc) => {
      const problem = doc.problemId as unknown as {
        slug?: string;
        title?: string;
        moderationStatus?: string;
      };
      if (problem?.moderationStatus && problem.moderationStatus !== "approved") {
        return null;
      }
      return {
        id: String(doc._id),
        content: doc.content,
        createdAt: new Date(doc.createdAt).toISOString(),
        helpfulCount: doc.helpfulCount ?? 0,
        problem:
          problem?.slug && problem?.title
            ? { slug: problem.slug, title: problem.title }
            : null,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);
}

/**
 * Every solution-scoped comment for a problem, grouped by solution. One query
 * feeds all the inline solution threads instead of one request per card.
 */
export async function listSolutionCommentsGrouped(
  problemId: string
): Promise<Record<string, CommentDTO[]>> {
  await connectToDatabase();
  const viewer = await getCurrentUser();

  const id = toObjectId(problemId);
  if (!id) return {};

  const visibility: QueryFilter<IComment>["$or"] = [
    { moderationStatus: "approved" },
    ...(viewer?.isModerator ? [{ moderationStatus: "pending" as const }] : []),
    ...(viewer
      ? [
          {
            authorId: toObjectId(viewer.id),
            moderationStatus: { $ne: "removed" as const },
          },
        ]
      : []),
  ];

  const docs = await Comment.find({
    problemId: id,
    solutionId: { $ne: null },
    $or: visibility,
  })
    .sort({ createdAt: 1 })
    .limit(400)
    .populate("authorId", AUTHOR_FIELDS)
    .lean<IComment[]>()
    .exec();

  if (docs.length === 0) return {};

  const docIds = docs.map((d) => String(d._id));
  const [voteDirections, awardedIds] = await Promise.all([
    voteDirectionsFor(viewer?.id, docIds),
    awardedIdsFor(viewer?.id, docIds),
  ]);
  const ctx = { viewerId: viewer?.id ?? null, voteDirections, awardedIds };

  const grouped: Record<string, CommentDTO[]> = {};
  const byId = new Map<string, CommentDTO>();

  for (const doc of docs) {
    const dto = toCommentDTO(doc, ctx);
    byId.set(dto.id, dto);
  }

  for (const dto of byId.values()) {
    if (dto.parentId) {
      byId.get(dto.parentId)?.replies.push(dto);
      continue;
    }
    if (!dto.solutionId) continue;
    (grouped[dto.solutionId] ??= []).push(dto);
  }

  return grouped;
}
