"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Category } from "@/models";
import { requireUser } from "@/lib/auth/current-user";
import { suggestCategorySchema } from "@/lib/validation/schemas";
import { enforceRateLimit } from "@/lib/rate-limit";
import { moderateContent } from "@/lib/moderation";
import { getSetting } from "@/lib/config/settings";
import { slugify } from "@/lib/utils/slug";
import { normalizeWhitespace, stripUnsafe } from "@/lib/utils/text";
import { objectId } from "@/lib/utils/sanitize-query";
import {
  DomainError,
  fail,
  isDuplicateKeyError,
  ok,
  toActionError,
} from "@/lib/action-helpers";
import type { ActionResult } from "@/types";

/**
 * Suggest a category. New categories are created in `pending` and are invisible
 * platform-wide until an admin approves them, so the taxonomy cannot be
 * polluted by anyone with an account.
 */
export async function suggestCategory(
  raw: unknown
): Promise<ActionResult<{ status: "pending" | "exists"; name: string }>> {
  try {
    const user = await requireUser();
    await enforceRateLimit("category:suggest", user.id);

    const input = suggestCategorySchema.parse(raw);
    await connectToDatabase();

    const minReputation = await getSetting("reputationToSuggestCategory");
    if (user.reputation < minReputation && !user.isModerator) {
      throw new DomainError(
        `Suggesting new categories unlocks at Score ${minReputation}. Pick the closest existing one for now.`,
        "forbidden"
      );
    }

    const name = normalizeWhitespace(stripUnsafe(input.name));
    const slug = slugify(name, 40);
    if (!slug) throw new DomainError("That name can't be used as a category.");

    const decision = await moderateContent({
      kind: "category",
      body: `${name} ${input.description ?? ""}`,
      authorReputation: user.reputation,
    });
    if (decision.moderationStatus === "rejected") {
      return fail("That category name isn't allowed.", "moderation");
    }

    // Case-insensitive match catches "housing" vs "Housing" before we ever
    // reach the unique index.
    const existing = await Category.findOne({ $or: [{ slug }, { name }] })
      .collation({ locale: "en", strength: 2 })
      .lean()
      .exec();

    if (existing) {
      return ok(
        { status: "exists" as const, name: existing.name },
        existing.status === "approved"
          ? `"${existing.name}" already exists, use that one.`
          : `"${existing.name}" has already been suggested and is awaiting review.`
      );
    }

    try {
      await Category.create({
        name,
        slug,
        description: input.description
          ? normalizeWhitespace(stripUnsafe(input.description))
          : undefined,
        status: "pending",
        suggestedBy: objectId(user.id),
        order: 200,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return ok(
          { status: "exists" as const, name },
          "That category already exists."
        );
      }
      throw error;
    }

    revalidatePath("/admin/categories");

    return ok(
      { status: "pending" as const, name },
      `"${name}" was suggested. An admin will review it shortly.`
    );
  } catch (error) {
    return toActionError(error);
  }
}
