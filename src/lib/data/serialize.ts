import "server-only";
import type { Types } from "mongoose";
import { excerpt, stripMarkdown } from "@/lib/utils/text";
import { trustTierFor } from "@/lib/auth/current-user";
import type {
  AuthorRef,
  CategoryDTO,
  CategoryRef,
  CommentDTO,
  ImageRef,
  LocationRef,
  MaybeAuthor,
  ProblemDTO,
  ProfileDTO,
  SolutionDTO,
} from "@/types";
import type { ICategory, IComment, IProblem, ISolution, IUser } from "@/models";

/**
 * A document whose ref fields may or may not have been populated. The runtime
 * guards below narrow each one, so the type stays the plain interface.
 */
type Populated<T> = T;

export function id(value: unknown): string {
  return String((value as Types.ObjectId) ?? "");
}

function isPopulatedUser(value: unknown): value is IUser {
  return Boolean(
    value && typeof value === "object" && "username" in (value as object),
  );
}

function isPopulatedCategory(value: unknown): value is ICategory {
  return Boolean(
    value && typeof value === "object" && "slug" in (value as object),
  );
}

export function toAuthorRef(value: unknown): AuthorRef | null {
  if (!isPopulatedUser(value)) return null;
  return {
    id: id(value._id),
    name: value.name,
    username: value.username,
    avatar: value.avatar,
    reputation: value.reputation ?? 0,
    verified: value.verified ?? false,
  };
}

export function toCategoryRef(value: unknown): CategoryRef | null {
  if (!isPopulatedCategory(value)) return null;
  return {
    id: id(value._id),
    name: value.name,
    slug: value.slug,
    icon: value.icon ?? "Shapes",
  };
}

export function toCategoryDTO(value: ICategory): CategoryDTO {
  return {
    id: id(value._id),
    name: value.name,
    slug: value.slug,
    description: value.description,
    icon: value.icon ?? "Shapes",
    problemCount: value.problemCount ?? 0,
  };
}

export function locationLabel(location: IProblem["location"]): string {
  if (!location || location.scope === "global") return "Global";
  const parts = [location.city, location.region, location.country].filter(
    Boolean,
  ) as string[];
  return parts.length ? parts.join(", ") : "Global";
}

function toLocationRef(location: IProblem["location"]): LocationRef {
  return {
    scope: location?.scope ?? "global",
    country: location?.country || undefined,
    region: location?.region || undefined,
    city: location?.city || undefined,
    label: locationLabel(location),
  };
}

function toImages(images: IProblem["images"]): ImageRef[] {
  return (images ?? []).map((image) => ({
    url: image.url,
    width: image.width,
    height: image.height,
    alt: image.alt,
  }));
}

/**
 * Anonymity is enforced here: when `isAnonymous` is set the author object is
 * dropped entirely, so no downstream component can accidentally render it.
 * The owner still gets `isOwn: true` so they can manage their own post.
 */
function resolveAuthor(
  raw: unknown,
  isAnonymous: boolean,
): { author: MaybeAuthor; authorId: string } {
  const ref = toAuthorRef(raw);
  const authorId = ref ? ref.id : id(raw);
  return { author: isAnonymous ? null : ref, authorId };
}

export function toProblemDTO(
  doc: Populated<IProblem>,
  ctx: {
    viewerId?: string | null;
    validatedIds?: Set<string>;
    bookmarkedIds?: Set<string>;
  } = {},
): ProblemDTO {
  const { author, authorId } = resolveAuthor(doc.authorId, doc.isAnonymous);
  const problemId = id(doc._id);

  return {
    id: problemId,
    slug: doc.slug,
    title: doc.title,
    description: doc.description,
    excerpt: excerpt(stripMarkdown(doc.description), 190),
    category: toCategoryRef(doc.categoryId),
    author,
    isAnonymous: doc.isAnonymous,
    isOwn: Boolean(ctx.viewerId && authorId === ctx.viewerId),
    location: toLocationRef(doc.location),
    images: toImages(doc.images),
    status: doc.status,
    priority: doc.priority ?? "normal",
    moderationStatus: doc.moderationStatus,
    validationCount: doc.validationCount ?? 0,
    bookmarkCount: doc.bookmarkCount ?? 0,
    clickCount: doc.viewCount ?? 0,
    commentCount: doc.commentCount ?? 0,
    solutionCount: doc.solutionCount ?? 0,
    hasValidated: ctx.validatedIds?.has(problemId) ?? false,
    hasBookmarked: ctx.bookmarkedIds?.has(problemId) ?? false,
    featured: doc.featured ?? false,
    acceptedSolutionId: doc.acceptedSolutionId
      ? id(doc.acceptedSolutionId)
      : null,
    createdAt: new Date(doc.createdAt).toISOString(),
    editedAt: doc.editedAt ? new Date(doc.editedAt).toISOString() : null,
    solvedAt: doc.solvedAt ? new Date(doc.solvedAt).toISOString() : null,
  };
}

export function toSolutionDTO(
  doc: Populated<ISolution>,
  ctx: {
    viewerId?: string | null;
    votedIds?: Set<string>;
    acceptedSolutionId?: string | null;
    problemSlug?: string;
    problemTitle?: string;
  } = {},
): SolutionDTO {
  const { author, authorId } = resolveAuthor(doc.authorId, doc.isAnonymous);
  const solutionId = id(doc._id);

  const problem = doc.problemId as unknown;
  const populatedProblem =
    problem && typeof problem === "object" && "slug" in (problem as object)
      ? (problem as IProblem)
      : null;

  return {
    id: solutionId,
    problemId: populatedProblem ? id(populatedProblem._id) : id(doc.problemId),
    problemSlug: ctx.problemSlug ?? populatedProblem?.slug,
    problemTitle: ctx.problemTitle ?? populatedProblem?.title,
    title: doc.title,
    description: doc.description,
    url: doc.url || undefined,
    images: toImages(doc.images),
    author,
    isOwn: Boolean(ctx.viewerId && authorId === ctx.viewerId),
    helpfulCount: doc.helpfulCount ?? 0,
    commentCount: doc.commentCount ?? 0,
    hasVoted: ctx.votedIds?.has(solutionId) ?? false,
    hotScore: doc.hotScore ?? 0,
    status: doc.status,
    moderationStatus: doc.moderationStatus,
    isAccepted: Boolean(
      ctx.acceptedSolutionId && ctx.acceptedSolutionId === solutionId,
    ),
    createdAt: new Date(doc.createdAt).toISOString(),
    editedAt: doc.editedAt ? new Date(doc.editedAt).toISOString() : null,
  };
}

export function toCommentDTO(
  doc: Populated<IComment>,
  ctx: {
    viewerId?: string | null;
    voteDirections?: Map<string, "up" | "down">;
    awardedIds?: Set<string>;
  } = {},
): CommentDTO {
  const { author, authorId } = resolveAuthor(doc.authorId, doc.isAnonymous);
  const commentId = id(doc._id);
  const isDeleted = doc.status === "deleted";

  return {
    id: commentId,
    problemId: id(doc.problemId),
    solutionId: doc.solutionId ? id(doc.solutionId) : null,
    parentId: doc.parentId ? id(doc.parentId) : null,
    content: isDeleted ? "" : doc.content,
    author: isDeleted ? null : author,
    isOwn: Boolean(ctx.viewerId && authorId === ctx.viewerId && !isDeleted),
    helpfulCount: doc.helpfulCount ?? 0,
    voteDirection: ctx.voteDirections?.get(commentId) ?? null,
    awardCount: doc.awardCount ?? 0,
    hasAwarded: ctx.awardedIds?.has(commentId) ?? false,
    replyCount: doc.replyCount ?? 0,
    moderationStatus: doc.moderationStatus,
    isDeleted,
    createdAt: new Date(doc.createdAt).toISOString(),
    editedAt: doc.editedAt ? new Date(doc.editedAt).toISOString() : null,
    replies: [],
  };
}

export function toProfileDTO(doc: IUser): ProfileDTO {
  return {
    id: id(doc._id),
    name: doc.name,
    username: doc.username,
    avatar: doc.avatar,
    bio: doc.bio,
    socialLinks: doc.socialLinks,
    role: doc.role,
    reputation: doc.reputation ?? 0,
    trust: trustTierFor(doc.reputation ?? 0),
    joinedAt: new Date(doc.createdAt).toISOString(),
    stats: {
      problems: doc.stats?.problems ?? 0,
      solutions: doc.stats?.solutions ?? 0,
      comments: doc.stats?.comments ?? 0,
      solvedProblems: doc.stats?.solvedProblems ?? 0,
      helpfulVotes: doc.stats?.helpfulVotes ?? 0,
      validationsReceived: doc.stats?.validationsReceived ?? 0,
    },
  };
}

export const AUTHOR_FIELDS = "name username avatar reputation verified";
export const CATEGORY_FIELDS = "name slug icon";
