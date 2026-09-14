import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  Category,
  Comment,
  Problem,
  Report,
  Solution,
  User,
  type ICategory,
  type IComment,
  type IProblem,
  type IReport,
  type ISolution,
  type IUser,
} from "@/models";
import { findReportTarget } from "@/lib/db/content";
import { excerpt } from "@/lib/utils/text";
import type { ModerationStatus } from "@/lib/constants";
import type { ReportDTO } from "@/types";
import type { Types } from "mongoose";

interface TargetSummary {
  title: string;
  body: string;
  href: string | null;
  authorUsername: string | null;
  authorId: string | null;
  moderationStatus: ModerationStatus | null;
  reportCount: number;
}

/**
 * Resolves each report to a preview of what it is actually about, so a
 * moderator can decide without leaving the queue.
 */
async function summarizeTarget(
  targetType: IReport["targetType"],
  targetId: Types.ObjectId
): Promise<TargetSummary | null> {
  const record = await findReportTarget(targetType, targetId);
  if (!record) return null;

  const author = record.authorId as { _id?: unknown; username?: string } | undefined;

  if (targetType === "user") {
    const user = record as unknown as IUser;
    return {
      title: `@${user.username}`,
      body: user.bio ?? user.email,
      href: `/u/${user.username}`,
      authorUsername: user.username,
      authorId: String(user._id),
      moderationStatus: null,
      reportCount: 0,
    };
  }

  let href: string | null = null;
  if (targetType === "problem") {
    href = `/problems/${(record as unknown as IProblem).slug}`;
  } else {
    const problem = await Problem.findById(
      record.problemId as Types.ObjectId,
      { slug: 1 }
    )
      .lean()
      .exec();
    if (problem) {
      href =
        targetType === "solution"
          ? `/problems/${problem.slug}#solution-${String(record._id)}`
          : `/problems/${problem.slug}#comment-${String(record._id)}`;
    }
  }

  const title =
    targetType === "comment"
      ? "Comment"
      : String(record.title ?? "Untitled");
  const body = String(record.content ?? record.description ?? "");

  return {
    title,
    body: excerpt(body, 300),
    href,
    authorUsername: author?.username ?? null,
    authorId: author?._id ? String(author._id) : null,
    moderationStatus: (record.moderationStatus as ModerationStatus) ?? null,
    reportCount: Number(record.reportCount ?? 0),
  };
}

export async function listReports(
  status: IReport["status"] | "all" = "pending",
  limit = 50
): Promise<ReportDTO[]> {
  await connectToDatabase();

  const filter = status === "all" ? {} : { status };
  const reports = await Report.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("reporterId", "name username")
    .lean<IReport[]>()
    .exec();

  return Promise.all(
    reports.map(async (report) => {
      const reporter = report.reporterId as unknown as {
        name?: string;
        username?: string;
      } | null;

      return {
        id: String(report._id),
        targetType: report.targetType,
        targetId: String(report.targetId),
        reason: report.reason,
        details: report.details,
        status: report.status,
        reporter:
          reporter?.username && reporter?.name
            ? { name: reporter.name, username: reporter.username }
            : null,
        createdAt: new Date(report.createdAt).toISOString(),
        target: await summarizeTarget(report.targetType, report.targetId),
      };
    })
  );
}

export interface ModerationQueueItem {
  id: string;
  type: "problem" | "solution" | "comment";
  title: string;
  body: string;
  href: string | null;
  authorUsername: string | null;
  score: number;
  labels: string[];
  reason?: string;
  reportCount: number;
  createdAt: string;
}

/** Everything currently held for human review, newest first. */
export async function listModerationQueue(
  limit = 60
): Promise<ModerationQueueItem[]> {
  await connectToDatabase();

  const [problems, solutions, comments] = await Promise.all([
    Problem.find({ moderationStatus: "pending" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("authorId", "username")
      .lean<IProblem[]>()
      .exec(),
    Solution.find({ moderationStatus: "pending" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("authorId", "username")
      .populate("problemId", "slug")
      .lean<ISolution[]>()
      .exec(),
    Comment.find({ moderationStatus: "pending" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("authorId", "username")
      .populate("problemId", "slug")
      .lean<IComment[]>()
      .exec(),
  ]);

  const username = (value: unknown): string | null =>
    (value as { username?: string })?.username ?? null;
  const slug = (value: unknown): string | null =>
    (value as { slug?: string })?.slug ?? null;

  const items: ModerationQueueItem[] = [
    ...problems.map((p) => ({
      id: String(p._id),
      type: "problem" as const,
      title: p.title,
      body: excerpt(p.description, 300),
      href: `/problems/${p.slug}`,
      authorUsername: username(p.authorId),
      score: p.moderation?.score ?? 0,
      labels: p.moderation?.labels ?? [],
      reason: p.moderation?.reason,
      reportCount: p.reportCount ?? 0,
      createdAt: new Date(p.createdAt).toISOString(),
    })),
    ...solutions.map((s) => ({
      id: String(s._id),
      type: "solution" as const,
      title: s.title,
      body: excerpt(s.description, 300),
      href: slug(s.problemId)
        ? `/problems/${slug(s.problemId)}#solution-${String(s._id)}`
        : null,
      authorUsername: username(s.authorId),
      score: s.moderation?.score ?? 0,
      labels: s.moderation?.labels ?? [],
      reason: s.moderation?.reason,
      reportCount: s.reportCount ?? 0,
      createdAt: new Date(s.createdAt).toISOString(),
    })),
    ...comments.map((c) => ({
      id: String(c._id),
      type: "comment" as const,
      title: "Comment",
      body: excerpt(c.content, 300),
      href: slug(c.problemId)
        ? `/problems/${slug(c.problemId)}#comment-${String(c._id)}`
        : null,
      authorUsername: username(c.authorId),
      score: c.moderation?.score ?? 0,
      labels: c.moderation?.labels ?? [],
      reason: c.moderation?.reason,
      reportCount: c.reportCount ?? 0,
      createdAt: new Date(c.createdAt).toISOString(),
    })),
  ];

  return items.sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: ICategory["status"];
  problemCount: number;
  suggestedBy: string | null;
  createdAt: string;
}

export async function listAdminCategories(): Promise<AdminCategory[]> {
  await connectToDatabase();

  const docs = await Category.find({})
    .sort({ status: 1, order: 1, name: 1 })
    .populate("suggestedBy", "username")
    .lean<ICategory[]>()
    .exec();

  return docs.map((doc) => ({
    id: String(doc._id),
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    status: doc.status,
    problemCount: doc.problemCount ?? 0,
    suggestedBy:
      (doc.suggestedBy as unknown as { username?: string })?.username ?? null,
    createdAt: new Date(doc.createdAt).toISOString(),
  }));
}

export interface AdminUser {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  role: IUser["role"];
  status: IUser["status"];
  reputation: number;
  problems: number;
  solutions: number;
  suspendedUntil: string | null;
  createdAt: string;
}

export async function listAdminUsers(
  search?: string,
  limit = 50
): Promise<AdminUser[]> {
  await connectToDatabase();

  const filter =
    search && search.trim().length >= 2
      ? { $text: { $search: search.trim() } }
      : {};

  const docs = await User.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<IUser[]>()
    .exec();

  return docs.map((doc) => ({
    id: String(doc._id),
    name: doc.name,
    username: doc.username,
    email: doc.email,
    avatar: doc.avatar,
    role: doc.role,
    status: doc.status,
    reputation: doc.reputation ?? 0,
    problems: doc.stats?.problems ?? 0,
    solutions: doc.stats?.solutions ?? 0,
    suspendedUntil: doc.suspendedUntil
      ? new Date(doc.suspendedUntil).toISOString()
      : null,
    createdAt: new Date(doc.createdAt).toISOString(),
  }));
}

export interface AdminProblem {
  id: string;
  title: string;
  slug: string;
  status: IProblem["status"];
  moderationStatus: ModerationStatus;
  featured: boolean;
  validationCount: number;
  solutionCount: number;
  authorUsername: string | null;
  createdAt: string;
}

export async function listAdminProblems(limit = 50): Promise<AdminProblem[]> {
  await connectToDatabase();

  const docs = await Problem.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("authorId", "username")
    .lean<IProblem[]>()
    .exec();

  return docs.map((doc) => ({
    id: String(doc._id),
    title: doc.title,
    slug: doc.slug,
    status: doc.status,
    moderationStatus: doc.moderationStatus,
    featured: doc.featured ?? false,
    validationCount: doc.validationCount ?? 0,
    solutionCount: doc.solutionCount ?? 0,
    authorUsername:
      (doc.authorId as unknown as { username?: string })?.username ?? null,
    createdAt: new Date(doc.createdAt).toISOString(),
  }));
}
