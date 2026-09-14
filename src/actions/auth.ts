"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/db/mongoose";
import { User } from "@/models";
import { requireUser } from "@/lib/auth/current-user";
import { clearSessionCookie } from "@/lib/auth/session";
import { updateProfileSchema } from "@/lib/validation/schemas";
import { stripUnsafe } from "@/lib/utils/text";
import { objectId } from "@/lib/utils/sanitize-query";
import {
  DomainError,
  isDuplicateKeyError,
  ok,
  toActionError,
} from "@/lib/action-helpers";
import type { ActionResult } from "@/types";

export async function signOut(): Promise<void> {
  await clearSessionCookie();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateProfile(
  raw: unknown
): Promise<ActionResult<{ username: string }>> {
  try {
    const user = await requireUser();
    const input = updateProfileSchema.parse(raw);
    await connectToDatabase();

    const RESERVED = new Set([
      "admin", "api", "problems", "categories", "solutions", "leaderboard",
      "notifications", "settings", "search", "u", "about", "login", "signin",
      "signout", "new", "me", "moderator", "support", "help",
    ]);
    if (RESERVED.has(input.username)) {
      throw new DomainError("That username is reserved. Pick another.");
    }

    try {
      await User.updateOne(
        { _id: objectId(user.id) },
        {
          $set: {
            name: stripUnsafe(input.name),
            username: input.username,
            bio: input.bio ? stripUnsafe(input.bio) : undefined,
          },
        }
      ).exec();
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new DomainError("That username is already taken.", "duplicate");
      }
      throw error;
    }

    revalidatePath("/settings");
    revalidatePath(`/u/${input.username}`);
    revalidatePath("/", "layout");

    return ok({ username: input.username }, "Profile updated.");
  } catch (error) {
    return toActionError(error);
  }
}
