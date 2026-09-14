import "server-only";
import { Notification, type INotification } from "@/models";
import { toObjectId } from "@/lib/utils/sanitize-query";
import type { NotificationType } from "@/lib/constants";

interface NotifyInput {
  userId: string;
  type: NotificationType;
  actorId?: string | null;
  problemId?: string | null;
  solutionId?: string | null;
  commentId?: string | null;
  message?: string;
}

/**
 * Fire-and-forget notification. Never let a notification failure roll back the
 * user's actual action — and never notify someone about their own activity.
 */
export async function notify(input: NotifyInput): Promise<void> {
  if (input.actorId && input.actorId === input.userId) return;

  const userId = toObjectId(input.userId);
  if (!userId) return;

  try {
    await Notification.create({
      userId,
      type: input.type,
      actorId: input.actorId ? toObjectId(input.actorId) : null,
      problemId: input.problemId ? toObjectId(input.problemId) : null,
      solutionId: input.solutionId ? toObjectId(input.solutionId) : null,
      commentId: input.commentId ? toObjectId(input.commentId) : null,
      message: input.message,
    } as Partial<INotification>);
  } catch (error) {
    console.error("[notify] failed to create notification", error);
  }
}
