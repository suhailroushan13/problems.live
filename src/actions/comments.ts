"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  Comment,
  CommentVote,
  Problem,
  Solution,
  computeHotScore,
  problemSignal,
} from "@/models";
import { requireUser } from "@/lib/auth/current-user";
import {
  createCommentSchema,
  updateCommentSchema,
} from "@/lib/validation/schemas";
import { enforceRateLimit } from "@/lib/rate-limit";
import { moderateContent, moderationMessage } from "@/lib/moderation";
import { normalizeWhitespace, stripUnsafe } from "@/lib/utils/text";
import { objectId } from "@/lib/utils/sanitize-query";
import type { Types } from "mongoose";
import { awardReputation } from "@/lib/services/reputation";
import { notify } from "@/lib/services/notify";
import {
  DomainError,
  NotFoundError,
  fail,
  ok,
  okVoid,
  toActionError,
} from "@/lib/action-helpers";
import type { ActionResult } from "@/types";

async function refreshProblemHotScore(problemId: unknown): Promise<void> {
  const problem = await Problem.findById(problemId, {
    validationCount: 1,
    solutionCount: 1,
    commentCount: 1,
    createdAt: 1,
  })
    .lean()
    .exec();
  if (!problem) return;

  await Problem.updateOne(
    { _id: problem._id },
    { $set: { hotScore: computeHotScore(problemSignal(problem), problem.createdAt) } }
  ).exec();
}

export async function createComment(
  raw: unknown
): Promise<ActionResult<{ commentId: string; held: boolean }>> {
  try {
    const user = await requireUser();
    await enforceRateLimit("comment:create", user.id);

    const input = createCommentSchema.parse(raw);
    await connectToDatabase();

    const problem = await Problem.findOne(
      { _id: objectId(input.problemId), moderationStatus: "approved" },
      { authorId: 1, slug: 1 }
    )
      .lean()
      .exec();
    if (!problem) throw new NotFoundError("That problem is not available.");

    // Replies are flattened to a single level: a reply to a reply attaches to
    // the same root, which keeps threads readable instead of nesting forever.
    let parentId = input.parentId ? objectId(input.parentId) : null;
    let parentAuthorId: string | null = null;
    if (parentId) {
      const parent = await Comment.findOne(
        { _id: parentId, problemId: problem._id },
        { parentId: 1, authorId: 1 }
      )
        .lean()
        .exec();
      if (!parent) throw new NotFoundError("That comment no longer exists.");
      parentId = parent.parentId ? objectId(String(parent.parentId)) : parent._id;
      parentAuthorId = String(parent.authorId);
    }

    let solutionId: Types.ObjectId | null = null;
    if (input.solutionId) {
      const solution = await Solution.findOne(
        { _id: objectId(input.solutionId), problemId: problem._id },
        { _id: 1 }
      )
        .lean()
        .exec();
      if (!solution) throw new NotFoundError("That solution is not on this problem.");
      solutionId = solution._id;
    }

    const content = normalizeWhitespace(stripUnsafe(input.content));
    const decision = await moderateContent({
      kind: "comment",
      body: content,
      authorReputation: user.reputation,
    });
    if (decision.moderationStatus === "rejected") {
      return fail(moderationMessage(decision), "moderation");
    }

    const comment = await Comment.create({
      problemId: problem._id,
      solutionId,
      parentId,
      authorId: objectId(user.id),
      content,
      isAnonymous: input.isAnonymous,
      status: "visible",
      moderationStatus: decision.moderationStatus,
      moderation: {
        provider: decision.provider,
        score: decision.score,
        labels: decision.labels,
        reason: decision.reason,
      },
    });

    if (decision.moderationStatus === "approved") {
      await Promise.all([
        Problem.updateOne({ _id: problem._id }, { $inc: { commentCount: 1 } }).exec(),
        solutionId
          ? Solution.updateOne({ _id: solutionId }, { $inc: { commentCount: 1 } }).exec()
          : Promise.resolve(),
        parentId
          ? Comment.updateOne({ _id: parentId }, { $inc: { replyCount: 1 } }).exec()
          : Promise.resolve(),
        awardReputation(user.id, 0, { key: "comments", delta: 1 }),
      ]);

      await refreshProblemHotScore(problem._id);

      if (parentAuthorId) {
        await Promise.all([
          notify({
            userId: parentAuthorId,
            actorId: user.id,
            type: "comment_replied",
            problemId: String(problem._id),
            commentId: String(comment._id),
          }),
          // The conversation belongs to the problem author too. Do not
          // duplicate it when they wrote the parent comment themselves.
          parentAuthorId !== String(problem.authorId)
            ? notify({
                userId: String(problem.authorId),
                actorId: user.id,
                type: "problem_discussed",
                problemId: String(problem._id),
                commentId: String(comment._id),
              })
            : Promise.resolve(),
        ]);
      } else {
        await notify({
          userId: String(problem.authorId),
          actorId: user.id,
          type: "problem_commented",
          problemId: String(problem._id),
          commentId: String(comment._id),
        });

        // A verified company/person weighing in on the problem itself (not
        // buried in a reply thread) is worth a distinct notification from an
        // ordinary comment. notify() already no-ops for self-notifications.
        if (user.verified) {
          await notify({
            userId: String(problem.authorId),
            actorId: user.id,
            type: "verified_response",
            problemId: String(problem._id),
            commentId: String(comment._id),
          });
        }
      }
    }

    revalidatePath(`/problems/${problem.slug}`);

    return ok(
      { commentId: String(comment._id), held: decision.held },
      decision.held ? moderationMessage(decision) : undefined
    );
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateComment(
  raw: unknown
): Promise<ActionResult<{ content: string; held: boolean }>> {
  try {
    const user = await requireUser();
    const input = updateCommentSchema.parse(raw);
    await connectToDatabase();

    const comment = await Comment.findById(objectId(input.commentId)).exec();
    if (!comment) throw new NotFoundError("That comment no longer exists.");
    if (comment.status === "deleted") {
      throw new NotFoundError("That comment was deleted.");
    }

    if (String(comment.authorId) !== user.id) {
      throw new DomainError("You can only edit your own comments.", "forbidden");
    }

    const content = normalizeWhitespace(stripUnsafe(input.content));
    const decision = await moderateContent({
      kind: "comment",
      body: content,
      authorReputation: user.reputation,
    });
    if (decision.moderationStatus === "rejected") {
      return fail(moderationMessage(decision), "moderation");
    }

    comment.content = content;
    comment.editedAt = new Date();
    if (decision.moderationStatus === "pending") {
      comment.moderationStatus = "pending";
    }
    comment.moderation = {
      provider: decision.provider,
      score: decision.score,
      labels: decision.labels,
      reason: decision.reason,
      reviewedBy: null,
      reviewedAt: null,
    };
    await comment.save();

    const problem = await Problem.findById(comment.problemId, { slug: 1 })
      .lean()
      .exec();
    if (problem) revalidatePath(`/problems/${problem.slug}`);

    return ok({ content, held: decision.held });
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * Soft delete. Replies stay readable, so a thread does not lose its shape when
 * one participant removes their message.
 */
export async function deleteComment(
  commentId: string
): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();
    await connectToDatabase();

    const comment = await Comment.findById(objectId(commentId)).exec();
    if (!comment) throw new NotFoundError("That comment no longer exists.");

    const isOwner = String(comment.authorId) === user.id;
    if (!isOwner && !user.isModerator) {
      throw new DomainError("You can only delete your own comments.", "forbidden");
    }

    if (comment.status === "deleted") return okVoid();

    const wasVisible = comment.moderationStatus === "approved";
    comment.status = "deleted";
    comment.content = "";
    await comment.save();

    if (wasVisible) {
      await Promise.all([
        Problem.updateOne(
          { _id: comment.problemId },
          { $inc: { commentCount: -1 } }
        ).exec(),
        comment.solutionId
          ? Solution.updateOne(
              { _id: comment.solutionId },
              { $inc: { commentCount: -1 } }
            ).exec()
          : Promise.resolve(),
        comment.parentId
          ? Comment.updateOne(
              { _id: comment.parentId },
              { $inc: { replyCount: -1 } }
            ).exec()
          : Promise.resolve(),
        awardReputation(String(comment.authorId), 0, {
          key: "comments",
          delta: -1,
        }),
        CommentVote.deleteMany({ commentId: comment._id }).exec(),
      ]);
      await refreshProblemHotScore(comment.problemId);
    }

    const problem = await Problem.findById(comment.problemId, { slug: 1 })
      .lean()
      .exec();
    if (problem) revalidatePath(`/problems/${problem.slug}`);

    return okVoid("Comment deleted.");
  } catch (error) {
    return toActionError(error);
  }
}
