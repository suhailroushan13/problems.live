"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AuditLog, Category, Problem, Report, User } from "@/models";
import {
  findContentDocument,
  isContentTarget,
  setReportCount,
  type ContentTargetType,
} from "@/lib/db/content";
import { requireAdmin, requireModerator } from "@/lib/auth/current-user";
import { objectId } from "@/lib/utils/sanitize-query";
import { objectIdSchema } from "@/lib/validation/schemas";
import { slugify } from "@/lib/utils/slug";
import { notify } from "@/lib/services/notify";
import { awardReputation, refundProblemCredit } from "@/lib/services/reputation";
import { setSetting, invalidateSettingsCache, SETTING_DEFAULTS, type SettingKey } from "@/lib/config/settings";
import {
  DomainError,
  NotFoundError,
  okVoid,
  toActionError,
} from "@/lib/action-helpers";
import { REPUTATION } from "@/lib/constants";
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
  role: "user" | "moderator" | "admin"
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
  status: "open" | "being_solved" | "solved" | "not_relevant"
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
