"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Report } from "@/models";
import {
  hideForReview,
  isContentTarget,
  reportTargetExists,
  setReportCount,
} from "@/lib/db/content";
import { requireUser } from "@/lib/auth/current-user";
import { reportSchema } from "@/lib/validation/schemas";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getSetting } from "@/lib/config/settings";
import { objectId } from "@/lib/utils/sanitize-query";
import { stripUnsafe } from "@/lib/utils/text";
import {
  DomainError,
  NotFoundError,
  isDuplicateKeyError,
  okVoid,
  toActionError,
} from "@/lib/action-helpers";
import type { ActionResult } from "@/types";

/**
 * File a report. Content is never removed on a single report — reports
 * accumulate until they cross an operator-configured threshold, at which point
 * the item is hidden *pending review* rather than deleted. A human always makes
 * the final call in /admin.
 */
export async function reportContent(
  raw: unknown
): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();
    await enforceRateLimit("report:create", user.id);

    const input = reportSchema.parse(raw);
    await connectToDatabase();

    const minReputation = await getSetting("reputationToReport");
    if (user.reputation < minReputation) {
      throw new DomainError(
        "You need a little more reputation before you can report content.",
        "forbidden"
      );
    }

    const targetId = objectId(input.targetId);

    const exists = await reportTargetExists(input.targetType, targetId);
    if (!exists) throw new NotFoundError("That content no longer exists.");

    try {
      await Report.create({
        reporterId: objectId(user.id),
        targetType: input.targetType,
        targetId,
        reason: input.reason,
        details: input.details ? stripUnsafe(input.details) : undefined,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return okVoid("You already reported this. Our moderators are on it.");
      }
      throw error;
    }

    if (isContentTarget(input.targetType)) {
      const distinctReports = await Report.countDocuments({
        targetType: input.targetType,
        targetId,
        status: { $in: ["pending", "reviewing"] },
      }).exec();

      await setReportCount(input.targetType, targetId, distinctReports);

      const threshold = await getSetting("reportsToAutoHide");
      if (distinctReports >= threshold) {
        await hideForReview(input.targetType, targetId);
      }
    }

    revalidatePath("/admin/reports");

    return okVoid("Thanks, a moderator will review this.");
  } catch (error) {
    return toActionError(error);
  }
}
