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
import { isReservedUsername } from "@/lib/constants";
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

    const current = await User.findById(objectId(user.id), {
      username: 1,
      usernameChangedAt: 1,
    })
      .lean()
      .exec();

    const changingUsername = current?.username !== input.username;

    if (changingUsername) {
      if (current?.usernameChangedAt) {
        throw new DomainError(
          "You've already changed your username once — it can only be changed one time."
        );
      }
      if (isReservedUsername(input.username)) {
        throw new DomainError("That username is reserved. Pick another.");
      }
    }

    try {
      await User.updateOne(
        { _id: objectId(user.id) },
        {
          $set: {
            name: stripUnsafe(input.name),
            username: input.username,
            bio: input.bio ? stripUnsafe(input.bio) : undefined,
            ...(changingUsername ? { usernameChangedAt: new Date() } : {}),
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
