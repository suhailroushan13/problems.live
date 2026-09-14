import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Notification, type INotification } from "@/models";
import { getCurrentUser } from "@/lib/auth/current-user";
import { toObjectId } from "@/lib/utils/sanitize-query";
import type { NotificationDTO } from "@/types";

function hrefFor(doc: INotification): string {
  const problem = doc.problemId as unknown as { slug?: string } | null;
  if (problem?.slug) {
    const base = `/problems/${problem.slug}`;
    if (doc.commentId) return `${base}#comment-${String(doc.commentId)}`;
    if (doc.solutionId) return `${base}#solution-${String(doc.solutionId)}`;
    return base;
  }
  return "/notifications";
}

function toDTO(doc: INotification): NotificationDTO {
  const actor = doc.actorId as unknown as {
    name?: string;
    username?: string;
    avatar?: string;
  } | null;
  const problem = doc.problemId as unknown as {
    slug?: string;
    title?: string;
  } | null;
  const solution = doc.solutionId as unknown as { title?: string } | null;

  return {
    id: String(doc._id),
    type: doc.type,
    actor:
      actor?.username && actor?.name
        ? { name: actor.name, username: actor.username, avatar: actor.avatar }
        : null,
    problem:
      problem?.slug && problem?.title
        ? { slug: problem.slug, title: problem.title }
        : null,
    solutionTitle: solution?.title ?? null,
    commentId: doc.commentId ? String(doc.commentId) : null,
    message: doc.message ?? null,
    read: doc.read,
    createdAt: new Date(doc.createdAt).toISOString(),
    href: hrefFor(doc),
  };
}

export async function listNotifications(
  limit = 50
): Promise<NotificationDTO[]> {
  const viewer = await getCurrentUser();
  if (!viewer) return [];

  await connectToDatabase();
  const docs = await Notification.find({ userId: toObjectId(viewer.id) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("actorId", "name username avatar")
    .populate("problemId", "slug title")
    .populate("solutionId", "title")
    .lean<INotification[]>()
    .exec();

  return docs.map(toDTO);
}

export async function countUnreadNotifications(): Promise<number> {
  const viewer = await getCurrentUser();
  if (!viewer) return 0;

  await connectToDatabase();
  return Notification.countDocuments({
    userId: toObjectId(viewer.id),
    read: false,
  }).exec();
}
