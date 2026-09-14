import type {
  LocationScope,
  ModerationStatus,
  NotificationType,
  ProblemStatus,
  ReportReason,
  SolutionStatus,
  TrustTier,
  UserRole,
} from "@/lib/constants";

/**
 * Plain, serialisable shapes passed from Server Components into Client
 * Components. Mongoose documents never cross that boundary — and an
 * anonymous author is stripped here, not in the UI, so identity cannot leak
 * through a forgotten prop.
 */

export interface AuthorRef {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  reputation: number;
}

/** `null` means the post was published anonymously. */
export type MaybeAuthor = AuthorRef | null;

export interface CategoryRef {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export interface ImageRef {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}

export interface LocationRef {
  scope: LocationScope;
  country?: string;
  region?: string;
  city?: string;
  label: string;
}

export interface ProblemDTO {
  id: string;
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  category: CategoryRef | null;
  author: MaybeAuthor;
  isAnonymous: boolean;
  isOwn: boolean;
  location: LocationRef;
  images: ImageRef[];
  status: ProblemStatus;
  moderationStatus: ModerationStatus;
  validationCount: number;
  commentCount: number;
  solutionCount: number;
  hasValidated: boolean;
  featured: boolean;
  acceptedSolutionId: string | null;
  createdAt: string;
  editedAt: string | null;
  solvedAt: string | null;
}

export interface SolutionDTO {
  id: string;
  problemId: string;
  problemSlug?: string;
  problemTitle?: string;
  title: string;
  description: string;
  url?: string;
  images: ImageRef[];
  author: MaybeAuthor;
  isOwn: boolean;
  helpfulCount: number;
  commentCount: number;
  hasVoted: boolean;
  /** Server-computed decayed ranking score; stable across renders. */
  hotScore: number;
  status: SolutionStatus;
  moderationStatus: ModerationStatus;
  isAccepted: boolean;
  createdAt: string;
  editedAt: string | null;
}

export interface CommentDTO {
  id: string;
  problemId: string;
  solutionId: string | null;
  parentId: string | null;
  content: string;
  author: MaybeAuthor;
  isOwn: boolean;
  helpfulCount: number;
  hasVoted: boolean;
  replyCount: number;
  moderationStatus: ModerationStatus;
  isDeleted: boolean;
  createdAt: string;
  editedAt: string | null;
  replies: CommentDTO[];
}

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon: string;
  problemCount: number;
}

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  actor: { name: string; username: string; avatar?: string } | null;
  problem: { slug: string; title: string } | null;
  solutionTitle: string | null;
  commentId: string | null;
  message: string | null;
  read: boolean;
  createdAt: string;
  href: string;
}

export interface ProfileDTO {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  bio?: string;
  role: UserRole;
  reputation: number;
  trust: TrustTier;
  joinedAt: string;
  stats: {
    problems: number;
    solutions: number;
    comments: number;
    solvedProblems: number;
    helpfulVotes: number;
    validationsReceived: number;
  };
}

export interface LeaderboardEntry {
  rank: number;
  user: AuthorRef;
  value: number;
}

export interface ReportDTO {
  id: string;
  targetType: "problem" | "solution" | "comment" | "user";
  targetId: string;
  reason: ReportReason;
  details?: string;
  status: "pending" | "reviewing" | "dismissed" | "actioned";
  reporter: { name: string; username: string } | null;
  createdAt: string;
  target: {
    title: string;
    body: string;
    href: string | null;
    authorUsername: string | null;
    authorId: string | null;
    moderationStatus: ModerationStatus | null;
    reportCount: number;
  } | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  totalPages: number;
}

/** Uniform Server Action result. Actions never throw across the boundary. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]>; code?: ActionErrorCode };

export type ActionErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "validation"
  | "moderation"
  | "no_credits"
  | "duplicate"
  | "server_error";
