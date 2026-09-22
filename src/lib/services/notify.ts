import "server-only";
import { Notification, Problem, User, type INotification } from "@/models";
import { toObjectId } from "@/lib/utils/sanitize-query";
import { notificationCopy, type NotificationType } from "@/lib/constants";
import { sendActivityNotificationEmail } from "@/lib/services/email";
import { env } from "@/lib/env";

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

    const actorId = input.actorId ? toObjectId(input.actorId) : null;
    const problemId = input.problemId ? toObjectId(input.problemId) : null;
    const [recipient, actor, problem] = await Promise.all([
      User.findById(userId, { name: 1, email: 1 }).lean().exec(),
      actorId
        ? User.findById(actorId, { name: 1 }).lean().exec()
        : Promise.resolve(null),
      problemId
        ? Problem.findById(problemId, { title: 1, slug: 1 }).lean().exec()
        : Promise.resolve(null),
    ]);

    if (!recipient?.email) return;

    await sendActivityNotificationEmail({
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      actorName: actor?.name,
      action: notificationCopy(input.type),
      problemTitle: problem?.title,
      problemUrl: problem ? `${env.appUrl}/problems/${problem.slug}` : null,
      message: input.message,
    });
  } catch (error) {
    // Activity is already complete. A notification or email failure must not
    // make a comment, vote, or solution submission fail for its author.
    console.error("[notify] failed to deliver notification", error);
  }
}
