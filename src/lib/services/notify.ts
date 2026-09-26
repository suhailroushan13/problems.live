import "server-only";
import { Notification, Problem, User, type INotification } from "@/models";
import { toObjectId } from "@/lib/utils/sanitize-query";
import {
  notificationCopy,
  PROBLEM_VALIDATION_MILESTONES,
  type NotificationType,
} from "@/lib/constants";
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

/**
 * Fires "your problem reached N people" the moment `validationCount` lands
 * exactly on a configured threshold. `$addToSet` under a `$ne` filter claims
 * the milestone atomically — the update only matches (and only one caller
 * ever wins it) if that threshold hasn't already been recorded, so two
 * concurrent validations landing on the same count can't double-notify.
 */
export async function notifyProblemMilestone(params: {
  problemId: string;
  authorId: string;
  validationCount: number;
}): Promise<void> {
  const milestone = PROBLEM_VALIDATION_MILESTONES.find(
    (threshold) => threshold === params.validationCount,
  );
  if (!milestone) return;

  const problemId = toObjectId(params.problemId);
  if (!problemId) return;

  try {
    const claimed = await Problem.findOneAndUpdate(
      { _id: problemId, milestonesNotified: { $ne: milestone } },
      { $addToSet: { milestonesNotified: milestone } },
    ).exec();
    if (!claimed) return;

    await notify({
      userId: params.authorId,
      type: "problem_milestone",
      problemId: params.problemId,
      message: `Your problem reached ${milestone} people who have this too.`,
    });
  } catch (error) {
    console.error("[notify] failed to deliver milestone notification", error);
  }
}
