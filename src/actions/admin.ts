"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  AuditLog,
  Category,
  Comment,
  Invite,
  Problem,
  ProblemBookmark,
  ProblemClick,
  Report,
  Solution,
  SolutionVote,
  CommentVote,
  CommentAward,
  ProblemValidation,
  Notification,
  User,
  WaitlistSignup,
} from "@/models";
import {
  findContentDocument,
  isContentTarget,
  setReportCount,
  type ContentTargetType,
} from "@/lib/db/content";
import { requireAdmin, requireModerator } from "@/lib/auth/current-user";
import { objectId } from "@/lib/utils/sanitize-query";
import { objectIdSchema, usernameSchema } from "@/lib/validation/schemas";
import { slugify } from "@/lib/utils/slug";
import { stripUnsafe } from "@/lib/utils/text";
import { googleAuthUrlForInvite, hashInviteToken } from "@/lib/utils/invite-token";
import { notify } from "@/lib/services/notify";
import { sendInvitationEmail } from "@/lib/services/email";
import { awardReputation, refundProblemCredit } from "@/lib/services/reputation";
import {
  setSetting,
  invalidateSettingsCache,
  SETTING_DEFAULTS,
  type SettingKey,
} from "@/lib/config/settings";
import {
  DomainError,
  NotFoundError,
  ok,
  okVoid,
  isDuplicateKeyError,
  toActionError,
} from "@/lib/action-helpers";
import { isReservedUsername, REPUTATION } from "@/lib/constants";
import type { ActionResult } from "@/types";

async function audit(params: {
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await AuditLog.create({
      actorId: objectId(params.actorId),
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId ? objectId(params.targetId) : null,
      meta: params.meta,
    });
  } catch (error) {
    console.error("[audit] failed", error);
  }
}

const updateAdminUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name must be 80 characters or fewer."),
  username: usernameSchema,
});

/** Permanently removes every problem and its dependent community records. */
export async function deleteAllProblems(): Promise<ActionResult<{ deletedCount: number }>> {
  try {
    const admin = await requireAdmin();
    await connectToDatabase();

    const [problems, solutions, comments] = await Promise.all([
      Problem.find({}, { _id: 1 }).lean().exec(),
      Solution.find({}, { _id: 1 }).lean().exec(),
      Comment.find({}, { _id: 1 }).lean().exec(),
    ]);
    if (problems.length === 0) return ok({ deletedCount: 0 }, "There are no problems to delete.");

    const problemIds = problems.map((problem) => problem._id);
    const solutionIds = solutions.map((solution) => solution._id);
    const commentIds = comments.map((comment) => comment._id);

    await Promise.all([
      Problem.deleteMany({}).exec(),
      Solution.deleteMany({}).exec(),
      Comment.deleteMany({}).exec(),
      ProblemValidation.deleteMany({}).exec(),
      ProblemBookmark.deleteMany({}).exec(),
      ProblemClick.deleteMany({}).exec(),
      SolutionVote.deleteMany({}).exec(),
      CommentVote.deleteMany({}).exec(),
      CommentAward.deleteMany({}).exec(),
      Report.deleteMany({ targetType: { $in: ["problem", "solution", "comment"] } }).exec(),
      Notification.deleteMany({
        $or: [
          { problemId: { $in: problemIds } },
          { solutionId: { $in: solutionIds } },
          { commentId: { $in: commentIds } },
        ],
      }).exec(),
      AuditLog.deleteMany({ targetType: { $in: ["problem", "solution", "comment"] } }).exec(),
      Category.updateMany({}, { $set: { problemCount: 0 } }).exec(),
      User.updateMany({}, {
        $set: {
          "stats.problems": 0,
          "stats.solutions": 0,
          "stats.comments": 0,
          "stats.solvedProblems": 0,
          "stats.helpfulVotes": 0,
          "stats.validationsReceived": 0,
        },
      }).exec(),
    ]);

    await audit({
      actorId: admin.id,
      action: "problem.bulk_delete",
      targetType: "problem",
      meta: { count: problemIds.length },
    });
    revalidatePath("/", "layout");
    revalidatePath("/problems");
    revalidatePath("/admin");
    revalidatePath("/admin/problems");
    revalidatePath("/admin/users");
    return ok({ deletedCount: problemIds.length }, `Deleted all ${problemIds.length} problems and their related content.`);
  } catch (error) {
    return toActionError(error);
  }
}

/** Approve held content and make it public. */
export async function approveContent(
  targetType: ContentTargetType,
  targetId: string
): Promise<ActionResult<undefined>> {
  try {
    const moderator = await requireModerator();
    objectIdSchema.parse(targetId);
    await connectToDatabase();

    const doc = await findContentDocument(targetType, objectId(targetId));
    if (!doc) throw new NotFoundError();

    const wasApproved = doc.get("moderationStatus") === "approved";
    doc.set("moderationStatus", "approved");
    doc.set("moderation.reviewedBy", objectId(moderator.id));
    doc.set("moderation.reviewedAt", new Date());
    doc.set("reportCount", 0);
    await doc.save();

    // Counters were never incremented while the item sat in review.
    if (!wasApproved) {
      if (targetType === "problem") {
        await Category.updateOne(
          { _id: objectId(doc.get("categoryId")) },
          { $inc: { problemCount: 1 } }
        ).exec();
        await awardReputation(String(doc.get("authorId")), 0, {
          key: "problems",
          delta: 1,
        });
      }
      if (targetType === "solution") {
        await Problem.updateOne(
          { _id: objectId(doc.get("problemId")) },
          { $inc: { solutionCount: 1 } }
        ).exec();
        await awardReputation(String(doc.get("authorId")), 0, {
          key: "solutions",
          delta: 1,
        });
      }
      if (targetType === "comment" && doc.get("status") === "visible") {
        await Problem.updateOne(
          { _id: objectId(doc.get("problemId")) },
          { $inc: { commentCount: 1 } }
        ).exec();
        await awardReputation(String(doc.get("authorId")), 0, {
          key: "comments",
          delta: 1,
        });
      }

      await notify({
        userId: String(doc.get("authorId")),
        type: "content_approved",
        problemId:
          targetType === "problem"
            ? String(doc.get("_id"))
            : String(doc.get("problemId")),
      });
    }

    await Report.updateMany(
      { targetType, targetId: objectId(targetId), status: "pending" },
      {
        $set: {
          status: "dismissed",
          resolvedBy: objectId(moderator.id),
          resolvedAt: new Date(),
          resolution: "Content approved after review",
        },
      }
    ).exec();

    await audit({
      actorId: moderator.id,
      action: "content.approve",
      targetType,
      targetId,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/moderation");
    revalidatePath("/admin/reports");
    revalidatePath("/problems");

    return okVoid("Content approved and published.");
  } catch (error) {
    return toActionError(error);
  }
}

/** Remove content from public view without destroying the record. */
export async function removeContent(
  targetType: ContentTargetType,
  targetId: string,
  reason?: string
): Promise<ActionResult<undefined>> {
  try {
    const moderator = await requireModerator();
    objectIdSchema.parse(targetId);
    await connectToDatabase();

    const doc = await findContentDocument(targetType, objectId(targetId));
    if (!doc) throw new NotFoundError();

    const wasApproved = doc.get("moderationStatus") === "approved";
    doc.set("moderationStatus", "removed");
    doc.set("moderation.reviewedBy", objectId(moderator.id));
    doc.set("moderation.reviewedAt", new Date());
    doc.set("moderation.reason", reason || "Removed by moderator");
    await doc.save();

    if (wasApproved) {
      if (targetType === "problem") {
        await Category.updateOne(
          { _id: objectId(doc.get("categoryId")) },
          { $inc: { problemCount: -1 } }
        ).exec();
        await awardReputation(String(doc.get("authorId")), REPUTATION.CONTENT_REMOVED, {
          key: "problems",
          delta: -1,
        });
        // A removed problem should not permanently cost the author a credit.
        await refundProblemCredit(String(doc.get("authorId")));
      }
      if (targetType === "solution") {
        await Problem.updateOne(
          { _id: objectId(doc.get("problemId")) },
          { $inc: { solutionCount: -1 } }
        ).exec();
        await awardReputation(String(doc.get("authorId")), REPUTATION.CONTENT_REMOVED, {
          key: "solutions",
          delta: -1,
        });
      }
      if (targetType === "comment") {
        await Problem.updateOne(
          { _id: objectId(doc.get("problemId")) },
          { $inc: { commentCount: -1 } }
        ).exec();
        await awardReputation(String(doc.get("authorId")), REPUTATION.CONTENT_REMOVED, {
          key: "comments",
          delta: -1,
        });
      }
    }

    await Report.updateMany(
      { targetType, targetId: objectId(targetId), status: { $in: ["pending", "reviewing"] } },
      {
        $set: {
          status: "actioned",
          resolvedBy: objectId(moderator.id),
          resolvedAt: new Date(),
          resolution: reason || "Content removed",
        },
      }
    ).exec();

    await notify({
      userId: String(doc.get("authorId")),
      type: "content_removed",
      message: reason || "Your content was removed for breaking the guidelines.",
      problemId:
        targetType === "problem"
          ? String(doc.get("_id"))
          : String(doc.get("problemId")),
    });

    await audit({
      actorId: moderator.id,
      action: "content.remove",
      targetType,
      targetId,
      meta: { reason },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/moderation");
    revalidatePath("/admin/reports");
    revalidatePath("/problems");

    return okVoid("Content removed.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function dismissReport(
  reportId: string
): Promise<ActionResult<undefined>> {
  try {
    const moderator = await requireModerator();
    objectIdSchema.parse(reportId);
    await connectToDatabase();

    const report = await Report.findById(objectId(reportId)).exec();
    if (!report) throw new NotFoundError();

    report.status = "dismissed";
    report.resolvedBy = objectId(moderator.id);
    report.resolvedAt = new Date();
    await report.save();

    if (isContentTarget(report.targetType)) {
      const remaining = await Report.countDocuments({
        targetType: report.targetType,
        targetId: report.targetId,
        status: { $in: ["pending", "reviewing"] },
      }).exec();
      await setReportCount(report.targetType, report.targetId, remaining);
    }

    await audit({
      actorId: moderator.id,
      action: "report.dismiss",
      targetType: "report",
      targetId: reportId,
    });

    revalidatePath("/admin/reports");
    return okVoid("Report dismissed.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function suspendUser(
  userId: string,
  days: number,
  reason?: string
): Promise<ActionResult<undefined>> {
  try {
    const admin = await requireAdmin();
    objectIdSchema.parse(userId);
    await connectToDatabase();

    if (userId === admin.id) {
      throw new DomainError("You can't suspend your own account.", "forbidden");
    }

    const target = await User.findById(objectId(userId)).exec();
    if (!target) throw new NotFoundError();
    if (target.role === "admin") {
      throw new DomainError("Admins can't be suspended from here.", "forbidden");
    }

    const duration = Math.min(Math.max(Math.round(days), 1), 3650);
    target.status = "suspended";
    target.suspendedUntil = new Date(Date.now() + duration * 86_400_000);
    target.suspensionReason = reason;
    await target.save();

    await audit({
      actorId: admin.id,
      action: "user.suspend",
      targetType: "user",
      targetId: userId,
      meta: { days: duration, reason },
    });

    revalidatePath("/admin/users");
    return okVoid(`@${target.username} suspended for ${duration} days.`);
  } catch (error) {
    return toActionError(error);
  }
}

export async function unsuspendUser(
  userId: string
): Promise<ActionResult<undefined>> {
  try {
    const admin = await requireAdmin();
    objectIdSchema.parse(userId);
    await connectToDatabase();

    const target = await User.findById(objectId(userId)).exec();
    if (!target) throw new NotFoundError();

    target.status = "active";
    target.suspendedUntil = null;
    target.suspensionReason = undefined;
    await target.save();

    await audit({
      actorId: admin.id,
      action: "user.unsuspend",
      targetType: "user",
      targetId: userId,
    });

    revalidatePath("/admin/users");
    return okVoid(`@${target.username} reinstated.`);
  } catch (error) {
    return toActionError(error);
  }
}

export async function setUserRole(
  userId: string,
  role: "user" | "admin"
): Promise<ActionResult<undefined>> {
  try {
    const admin = await requireAdmin();
    objectIdSchema.parse(userId);
    await connectToDatabase();

    if (userId === admin.id) {
      throw new DomainError("You can't change your own role.", "forbidden");
    }

    const target = await User.findByIdAndUpdate(
      objectId(userId),
      { $set: { role } },
      { returnDocument: "after" }
    )
      .lean()
      .exec();
    if (!target) throw new NotFoundError();

    await audit({
      actorId: admin.id,
      action: "user.role",
      targetType: "user",
      targetId: userId,
      meta: { role },
    });

    revalidatePath("/admin/users");
    return okVoid(`@${target.username} is now ${role}.`);
  } catch (error) {
    return toActionError(error);
  }
}

/** Updates the public profile fields an administrator is allowed to manage. */
export async function updateAdminUser(
  userId: string,
  raw: unknown
): Promise<ActionResult<undefined>> {
  try {
    const admin = await requireAdmin();
    objectIdSchema.parse(userId);
    const input = updateAdminUserSchema.parse(raw);
    await connectToDatabase();

    if (isReservedUsername(input.username)) {
      throw new DomainError("That username is reserved. Pick another.");
    }

    const existing = await User.findById(objectId(userId), { username: 1 })
      .lean()
      .exec();
    if (!existing) throw new NotFoundError();

    try {
      await User.updateOne(
        { _id: objectId(userId) },
        { $set: { name: stripUnsafe(input.name), username: input.username } }
      ).exec();
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new DomainError("That username is already taken.", "duplicate");
      }
      throw error;
    }

    await audit({
      actorId: admin.id,
      action: "user.update",
      targetType: "user",
      targetId: userId,
      meta: { username: input.username },
    });

    revalidatePath("/admin/users");
    revalidatePath(`/u/${existing.username}`);
    revalidatePath(`/u/${input.username}`);
    return okVoid(`@${input.username} updated.`);
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * Builds `$inc` bulk-write ops from a map of id -> delta, skipping zero
 * deltas. The field name is dynamic, which Mongoose's generic `bulkWrite`
 * types can't express, so the array is deliberately untyped here and cast
 * at each call site.
 */
function incOps(
  deltas: Map<string, number>,
  field: string
): Record<string, unknown>[] {
  return Array.from(deltas.entries())
    .filter(([, delta]) => delta !== 0)
    .map(([id, delta]) => ({
      updateOne: {
        filter: { _id: objectId(id) },
        update: { $inc: { [field]: delta } },
      },
    }));
}

function addDelta(map: Map<string, number>, key: string, amount = 1): void {
  map.set(key, (map.get(key) ?? 0) + amount);
}

/**
 * Deletes user accounts and everything they authored. Admins and the acting
 * admin's own account are always excluded, even if passed in — this is the
 * one action in the app with no undo, so it never trusts the caller alone.
 *
 * Cascade depth matches the single-item delete actions elsewhere
 * (deleteProblem/deleteSolution/deleteComment): posts and their own replies
 * are hard-deleted, comments left on content that survives are soft-deleted
 * (status "deleted") so reply threads keep their shape, and votes cast by
 * the removed users are reversed exactly like an unvote — decrementing the
 * receiving author's counter and reputation — so the numbers on surviving
 * content stay honest.
 */
export async function bulkDeleteUsers(
  rawUserIds: string[]
): Promise<ActionResult<{ deletedCount: number }>> {
  try {
    const admin = await requireAdmin();
    const ids = z.array(objectIdSchema).min(1).max(500).parse(rawUserIds);
    await connectToDatabase();

    const objectIds = Array.from(new Set(ids)).map((id) => objectId(id));

    const targets = await User.find(
      { _id: { $in: objectIds, $ne: objectId(admin.id) }, role: { $ne: "admin" } },
      { _id: 1, username: 1 }
    )
      .lean()
      .exec();

    if (targets.length === 0) {
      throw new DomainError(
        "Nothing to delete, your own account and other admins are always protected."
      );
    }

    const targetIds = targets.map((u) => u._id);

    // --- Problems these users authored: same cascade as deleteProblem(). ---
    const ownProblems = await Problem.find(
      { authorId: { $in: targetIds } },
      { _id: 1, categoryId: 1, moderationStatus: 1 }
    )
      .lean()
      .exec();
    const ownProblemIds = ownProblems.map((p) => p._id);

    const categoryDeltas = new Map<string, number>();
    for (const p of ownProblems) {
      if (p.moderationStatus === "approved") {
        addDelta(categoryDeltas, String(p.categoryId), -1);
      }
    }

    await Promise.all([
      Problem.deleteMany({ _id: { $in: ownProblemIds } }).exec(),
      Comment.deleteMany({ problemId: { $in: ownProblemIds } }).exec(),
      Solution.deleteMany({ problemId: { $in: ownProblemIds } }).exec(),
      ProblemValidation.deleteMany({ problemId: { $in: ownProblemIds } }).exec(),
      ProblemBookmark.deleteMany({ problemId: { $in: ownProblemIds } }).exec(),
    ]);
    if (categoryDeltas.size > 0) {
      await Category.bulkWrite(incOps(categoryDeltas, "problemCount") as never[]);
    }

    // --- Their solutions on problems that still exist: same cascade as
    // deleteSolution(). ---
    const ownSolutions = await Solution.find(
      { authorId: { $in: targetIds }, problemId: { $nin: ownProblemIds } },
      { _id: 1, problemId: 1, moderationStatus: 1 }
    )
      .lean()
      .exec();
    const ownSolutionIds = ownSolutions.map((s) => s._id);

    const solutionCountDeltas = new Map<string, number>();
    for (const s of ownSolutions) {
      if (s.moderationStatus === "approved") {
        addDelta(solutionCountDeltas, String(s.problemId), -1);
      }
    }

    await Promise.all([
      Solution.deleteMany({ _id: { $in: ownSolutionIds } }).exec(),
      SolutionVote.deleteMany({ solutionId: { $in: ownSolutionIds } }).exec(),
      Comment.deleteMany({ solutionId: { $in: ownSolutionIds } }).exec(),
      Problem.updateMany(
        { acceptedSolutionId: { $in: ownSolutionIds } },
        { $set: { acceptedSolutionId: null } }
      ).exec(),
    ]);
    if (solutionCountDeltas.size > 0) {
      await Problem.bulkWrite(incOps(solutionCountDeltas, "solutionCount") as never[]);
    }

    // --- Their comments on content that still exists: soft delete, same as
    // deleteComment(), so surviving reply threads keep their shape. ---
    const ownComments = await Comment.find(
      {
        authorId: { $in: targetIds },
        problemId: { $nin: ownProblemIds },
        status: "visible",
      },
      { _id: 1, problemId: 1, solutionId: 1, parentId: 1, moderationStatus: 1 }
    )
      .lean()
      .exec();

    const problemCommentDeltas = new Map<string, number>();
    const solutionCommentDeltas = new Map<string, number>();
    const replyDeltas = new Map<string, number>();
    for (const c of ownComments) {
      if (c.moderationStatus !== "approved") continue;
      addDelta(problemCommentDeltas, String(c.problemId), -1);
      if (c.solutionId) addDelta(solutionCommentDeltas, String(c.solutionId), -1);
      if (c.parentId) addDelta(replyDeltas, String(c.parentId), -1);
    }

    if (ownComments.length > 0) {
      const ownCommentIds = ownComments.map((c) => c._id);
      await Promise.all([
        Comment.updateMany(
          { _id: { $in: ownCommentIds } },
          { $set: { status: "deleted", content: "" } }
        ).exec(),
        CommentVote.deleteMany({ commentId: { $in: ownCommentIds } }).exec(),
      ]);
    }
    await Promise.all([
      problemCommentDeltas.size > 0
        ? Problem.bulkWrite(incOps(problemCommentDeltas, "commentCount") as never[])
        : null,
      solutionCommentDeltas.size > 0
        ? Solution.bulkWrite(incOps(solutionCommentDeltas, "commentCount") as never[])
        : null,
      replyDeltas.size > 0
        ? Comment.bulkWrite(incOps(replyDeltas, "replyCount") as never[])
        : null,
    ]);

    // --- Validations, solution votes, and comment votes THESE users cast on
    // content that still exists: reverse them exactly like an unvote would
    // (see toggleProblemValidation/toggleSolutionHelpful/toggleCommentHelpful
    // in actions/votes.ts), so the receiving author's stats stay accurate.
    const castValidations = await ProblemValidation.find(
      { userId: { $in: targetIds } },
      { _id: 1, problemId: 1 }
    )
      .lean()
      .exec();
    if (castValidations.length > 0) {
      await ProblemValidation.deleteMany({
        _id: { $in: castValidations.map((v) => v._id) },
      }).exec();

      const survivingProblems = await Problem.find(
        { _id: { $in: castValidations.map((v) => v.problemId) } },
        { _id: 1, authorId: 1 }
      )
        .lean()
        .exec();
      const authorByProblem = new Map(
        survivingProblems.map((p) => [String(p._id), String(p.authorId)])
      );

      const validationDeltas = new Map<string, number>();
      for (const v of castValidations) {
        const key = String(v.problemId);
        if (authorByProblem.has(key)) addDelta(validationDeltas, key, -1);
      }
      if (validationDeltas.size > 0) {
        await Problem.bulkWrite(incOps(validationDeltas, "validationCount") as never[]);
      }
      await Promise.all(
        Array.from(validationDeltas.entries()).map(([problemId, delta]) =>
          awardReputation(authorByProblem.get(problemId), delta * REPUTATION.PROBLEM_VALIDATED, {
            key: "validationsReceived",
            delta,
          })
        )
      );
    }

    const castSolutionVotes = await SolutionVote.find(
      { userId: { $in: targetIds } },
      { _id: 1, solutionId: 1 }
    )
      .lean()
      .exec();
    if (castSolutionVotes.length > 0) {
      await SolutionVote.deleteMany({
        _id: { $in: castSolutionVotes.map((v) => v._id) },
      }).exec();

      const survivingSolutions = await Solution.find(
        { _id: { $in: castSolutionVotes.map((v) => v.solutionId) } },
        { _id: 1, authorId: 1 }
      )
        .lean()
        .exec();
      const authorBySolution = new Map(
        survivingSolutions.map((s) => [String(s._id), String(s.authorId)])
      );

      const helpfulDeltas = new Map<string, number>();
      for (const v of castSolutionVotes) {
        const key = String(v.solutionId);
        if (authorBySolution.has(key)) addDelta(helpfulDeltas, key, -1);
      }
      if (helpfulDeltas.size > 0) {
        await Solution.bulkWrite(incOps(helpfulDeltas, "helpfulCount") as never[]);
      }
      await Promise.all(
        Array.from(helpfulDeltas.entries()).map(([solutionId, delta]) =>
          awardReputation(authorBySolution.get(solutionId), delta * REPUTATION.SOLUTION_HELPFUL, {
            key: "helpfulVotes",
            delta,
          })
        )
      );
    }

    const castCommentVotes = await CommentVote.find(
      { userId: { $in: targetIds } },
      { _id: 1, commentId: 1 }
    )
      .lean()
      .exec();
    if (castCommentVotes.length > 0) {
      await CommentVote.deleteMany({
        _id: { $in: castCommentVotes.map((v) => v._id) },
      }).exec();

      const survivingComments = await Comment.find(
        { _id: { $in: castCommentVotes.map((v) => v.commentId) } },
        { _id: 1, authorId: 1 }
      )
        .lean()
        .exec();
      const authorByComment = new Map(
        survivingComments.map((c) => [String(c._id), String(c.authorId)])
      );

      const helpfulDeltas = new Map<string, number>();
      for (const v of castCommentVotes) {
        const key = String(v.commentId);
        if (authorByComment.has(key)) addDelta(helpfulDeltas, key, -1);
      }
      if (helpfulDeltas.size > 0) {
        await Comment.bulkWrite(incOps(helpfulDeltas, "helpfulCount") as never[]);
      }
      await Promise.all(
        Array.from(helpfulDeltas.entries()).map(([commentId, delta]) =>
          awardReputation(authorByComment.get(commentId), delta * REPUTATION.COMMENT_HELPFUL, {
            key: "helpfulVotes",
            delta,
          })
        )
      );
    }

    // --- Private bookmarks from deleted accounts: remove the relationships
    // and reverse their public aggregate counters on problems that survive. ---
    const castBookmarks = await ProblemBookmark.find(
      { userId: { $in: targetIds } },
      { _id: 1, problemId: 1 },
    )
      .lean()
      .exec();
    if (castBookmarks.length > 0) {
      const bookmarkDeltas = new Map<string, number>();
      for (const bookmark of castBookmarks) {
        addDelta(bookmarkDeltas, String(bookmark.problemId), -1);
      }
      await Promise.all([
        ProblemBookmark.deleteMany({
          _id: { $in: castBookmarks.map((bookmark) => bookmark._id) },
        }).exec(),
        bookmarkDeltas.size > 0
          ? Problem.bulkWrite(incOps(bookmarkDeltas, "bookmarkCount") as never[])
          : null,
      ]);
    }

    // --- Records that belong directly to the deleted accounts. ---
    await Promise.all([
      Notification.deleteMany({ userId: { $in: targetIds } }).exec(),
      Report.deleteMany({
        $or: [
          { reporterId: { $in: targetIds } },
          { targetType: "user", targetId: { $in: targetIds } },
        ],
      }).exec(),
    ]);

    await User.deleteMany({ _id: { $in: targetIds } }).exec();

    await audit({
      actorId: admin.id,
      action: "user.bulk_delete",
      targetType: "user",
      meta: {
        count: targetIds.length,
        usernames: targets.slice(0, 50).map((u) => u.username),
      },
    });

    revalidatePath("/admin/users");
    revalidatePath("/");
    revalidatePath("/problems");

    return ok(
      { deletedCount: targetIds.length },
      `Deleted ${targetIds.length} ${targetIds.length === 1 ? "user" : "users"} and everything they posted.`
    );
  } catch (error) {
    return toActionError(error);
  }
}

export async function approveCategory(
  categoryId: string
): Promise<ActionResult<undefined>> {
  try {
    const admin = await requireAdmin();
    objectIdSchema.parse(categoryId);
    await connectToDatabase();

    const category = await Category.findById(objectId(categoryId)).exec();
    if (!category) throw new NotFoundError();

    category.status = "approved";
    if (!category.slug) category.slug = slugify(category.name, 40);
    await category.save();

    if (category.suggestedBy) {
      await notify({
        userId: String(category.suggestedBy),
        type: "category_approved",
        message: `Your category "${category.name}" is now live.`,
      });
    }

    await audit({
      actorId: admin.id,
      action: "category.approve",
      targetType: "category",
      targetId: categoryId,
    });

    revalidatePath("/admin/categories");
    revalidatePath("/categories");
    return okVoid(`"${category.name}" approved.`);
  } catch (error) {
    return toActionError(error);
  }
}

export async function rejectCategory(
  categoryId: string
): Promise<ActionResult<undefined>> {
  try {
    const admin = await requireAdmin();
    objectIdSchema.parse(categoryId);
    await connectToDatabase();

    const category = await Category.findByIdAndUpdate(
      objectId(categoryId),
      { $set: { status: "rejected" } },
      { returnDocument: "after" }
    )
      .lean()
      .exec();
    if (!category) throw new NotFoundError();

    await audit({
      actorId: admin.id,
      action: "category.reject",
      targetType: "category",
      targetId: categoryId,
    });

    revalidatePath("/admin/categories");
    return okVoid(`"${category.name}" rejected.`);
  } catch (error) {
    return toActionError(error);
  }
}

/** Move every problem out of `sourceId` into `targetId`, then retire the source. */
export async function mergeCategories(
  sourceId: string,
  targetId: string
): Promise<ActionResult<undefined>> {
  try {
    const admin = await requireAdmin();
    objectIdSchema.parse(sourceId);
    objectIdSchema.parse(targetId);
    await connectToDatabase();

    if (sourceId === targetId) {
      throw new DomainError("Pick two different categories.");
    }

    const [source, target] = await Promise.all([
      Category.findById(objectId(sourceId)).exec(),
      Category.findById(objectId(targetId)).exec(),
    ]);
    if (!source || !target) throw new NotFoundError();

    const moved = await Problem.updateMany(
      { categoryId: source._id },
      { $set: { categoryId: target._id } }
    ).exec();

    // Recount from the source of truth instead of trusting the old counters.
    const [sourceCount, targetCount] = await Promise.all([
      Problem.countDocuments({ categoryId: source._id, moderationStatus: "approved" }).exec(),
      Problem.countDocuments({ categoryId: target._id, moderationStatus: "approved" }).exec(),
    ]);

    source.status = "merged";
    source.mergedInto = target._id;
    source.problemCount = sourceCount;
    await source.save();

    target.problemCount = targetCount;
    await target.save();

    await audit({
      actorId: admin.id,
      action: "category.merge",
      targetType: "category",
      targetId: sourceId,
      meta: { into: targetId, moved: moved.modifiedCount },
    });

    revalidatePath("/admin/categories");
    revalidatePath("/categories");
    return okVoid(
      `Moved ${moved.modifiedCount} problems into "${target.name}".`
    );
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * Categories with problems must be merged, not deleted — otherwise every
 * problem in them would be left pointing at a categoryId that no longer
 * exists. An empty category (rejected, or approved but never used) can go
 * straight away.
 */
export async function deleteCategory(
  categoryId: string
): Promise<ActionResult<undefined>> {
  try {
    const admin = await requireAdmin();
    objectIdSchema.parse(categoryId);
    await connectToDatabase();

    const category = await Category.findById(objectId(categoryId)).exec();
    if (!category) throw new NotFoundError();

    const problemCount = await Problem.countDocuments({
      categoryId: category._id,
    }).exec();
    if (problemCount > 0) {
      throw new DomainError(
        `"${category.name}" still has ${problemCount} ${problemCount === 1 ? "problem" : "problems"}. Merge it into another category first.`
      );
    }

    await category.deleteOne();

    await audit({
      actorId: admin.id,
      action: "category.delete",
      targetType: "category",
      targetId: categoryId,
      meta: { name: category.name },
    });

    revalidatePath("/admin/categories");
    revalidatePath("/categories");
    return okVoid(`"${category.name}" deleted.`);
  } catch (error) {
    return toActionError(error);
  }
}

export async function toggleFeatured(
  problemId: string
): Promise<ActionResult<undefined>> {
  try {
    const admin = await requireAdmin();
    objectIdSchema.parse(problemId);
    await connectToDatabase();

    const problem = await Problem.findById(objectId(problemId)).exec();
    if (!problem) throw new NotFoundError();

    problem.featured = !problem.featured;
    await problem.save();

    await audit({
      actorId: admin.id,
      action: "problem.feature",
      targetType: "problem",
      targetId: problemId,
      meta: { featured: problem.featured },
    });

    revalidatePath("/");
    revalidatePath("/admin/problems");
    return okVoid(problem.featured ? "Problem featured." : "Problem unfeatured.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function adminSetProblemStatus(
  problemId: string,
  status: "open" | "needs_collaborators" | "being_solved" | "solved" | "not_relevant"
): Promise<ActionResult<undefined>> {
  try {
    const moderator = await requireModerator();
    objectIdSchema.parse(problemId);
    await connectToDatabase();

    const problem = await Problem.findByIdAndUpdate(
      objectId(problemId),
      {
        $set: {
          status,
          ...(status === "solved" ? { solvedAt: new Date() } : { solvedAt: null }),
        },
      },
      { returnDocument: "after" }
    )
      .lean()
      .exec();
    if (!problem) throw new NotFoundError();

    await audit({
      actorId: moderator.id,
      action: "problem.status",
      targetType: "problem",
      targetId: problemId,
      meta: { status },
    });

    revalidatePath(`/problems/${problem.slug}`);
    revalidatePath("/admin/problems");
    return okVoid("Status updated.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function updatePlatformSetting(
  key: string,
  rawValue: string
): Promise<ActionResult<undefined>> {
  try {
    const admin = await requireAdmin();
    await connectToDatabase();

    if (!(key in SETTING_DEFAULTS)) {
      throw new DomainError("Unknown setting.");
    }

    const fallback = SETTING_DEFAULTS[key as SettingKey];
    let value: unknown;

    if (Array.isArray(fallback)) {
      // Rate limits are "max, windowSeconds" pairs.
      const parts = rawValue
        .split(",")
        .map((p) => Number(p.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (parts.length !== 2) {
        throw new DomainError("Enter two positive numbers: max, window seconds.");
      }
      value = parts;
    } else if (typeof fallback === "number") {
      const parsed = Number(rawValue);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new DomainError("Enter a non-negative number.");
      }
      value = parsed;
    } else {
      value = rawValue;
    }

    await setSetting(key as SettingKey, value, admin.id);
    invalidateSettingsCache();

    await audit({
      actorId: admin.id,
      action: "setting.update",
      targetType: "setting",
      meta: { key, value },
    });

    revalidatePath("/admin/settings");
    return okVoid("Setting saved.");
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * Wipes every Invite record. Users created through past invites are
 * untouched — this only clears the invitation trail, not the accounts it led to.
 */
export async function deleteAllInvites(): Promise<ActionResult<{ deletedCount: number }>> {
  try {
    const admin = await requireAdmin();
    await connectToDatabase();

    const { deletedCount } = await Invite.deleteMany({}).exec();

    await audit({
      actorId: admin.id,
      action: "invite.delete_all",
      targetType: "invite",
      meta: { deletedCount },
    });

    revalidatePath("/admin/invites");
    revalidatePath("/invites");
    return ok({ deletedCount }, `Deleted ${deletedCount} invitation${deletedCount === 1 ? "" : "s"}.`);
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * Turns a waitlist lead into a real Invite and emails them a direct sign-in
 * link — approving here grants nothing by itself, the Invite flow is the
 * only thing that ever grants access. Accepting it is what gives them their
 * 5 invitations (see `acceptInvite`), same as any other invited user.
 */
export async function approveWaitlistSignup(rawId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const id = objectIdSchema.parse(rawId);
    await connectToDatabase();

    const signup = await WaitlistSignup.findOne({ _id: objectId(id), status: "pending" }).lean().exec();
    if (!signup) {
      throw new DomainError("This signup has already been handled.");
    }

    if (await User.exists({ email: signup.email })) {
      await WaitlistSignup.updateOne(
        { _id: signup._id },
        { $set: { status: "approved", respondedAt: new Date(), respondedBy: objectId(admin.id) } },
      ).exec();
      revalidatePath("/admin/waiting-list");
      return okVoid(`${signup.name} already has an account — marked as approved.`);
    }

    if (await Invite.exists({ email: signup.email, status: "pending" })) {
      throw new DomainError("This email already has a pending invitation.");
    }

    const token = randomBytes(32).toString("base64url");
    try {
      await Invite.create({
        name: signup.name,
        email: signup.email,
        type: "email",
        tokenHash: hashInviteToken(token),
        inviterId: admin.id,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) throw new DomainError("This email already has a pending invitation.");
      throw error;
    }

    await sendInvitationEmail({
      name: signup.name,
      email: signup.email,
      inviteUrl: googleAuthUrlForInvite(token),
    });

    await WaitlistSignup.updateOne(
      { _id: signup._id },
      { $set: { status: "approved", respondedAt: new Date(), respondedBy: objectId(admin.id) } },
    ).exec();

    await audit({
      actorId: admin.id,
      action: "waitlist.approve",
      targetType: "waitlist_signup",
      targetId: String(signup._id),
      meta: { email: signup.email },
    });

    revalidatePath("/admin/waiting-list");
    return okVoid(`Invited ${signup.name}.`);
  } catch (error) {
    return toActionError(error);
  }
}

export async function rejectWaitlistSignup(rawId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const id = objectIdSchema.parse(rawId);
    await connectToDatabase();

    const signup = await WaitlistSignup.findOneAndUpdate(
      { _id: objectId(id), status: "pending" },
      { $set: { status: "rejected", respondedAt: new Date(), respondedBy: objectId(admin.id) } },
      { new: true },
    ).lean().exec();
    if (!signup) {
      throw new DomainError("This signup has already been handled.");
    }

    await audit({
      actorId: admin.id,
      action: "waitlist.reject",
      targetType: "waitlist_signup",
      targetId: String(signup._id),
    });

    revalidatePath("/admin/waiting-list");
    return okVoid(`Rejected ${signup.name}.`);
  } catch (error) {
    return toActionError(error);
  }
}
