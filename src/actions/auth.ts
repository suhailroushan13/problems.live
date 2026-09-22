"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Comment, Notification, Passkey, Problem, ProblemBookmark, Report, Solution, User } from "@/models";
import { requireUser } from "@/lib/auth/current-user";
import { clearSessionCookie } from "@/lib/auth/session";
import {
  checkUsernameSchema,
  accountPreferencesSchema,
  deleteAccountSchema,
  onboardingSchema,
  updateProfileSchema,
} from "@/lib/validation/schemas";
import { stripUnsafe } from "@/lib/utils/text";
import { randomAnonymousUsername } from "@/lib/utils/anonymous-identity";
import { objectId } from "@/lib/utils/sanitize-query";
import { isReservedUsername } from "@/lib/constants";
import { AVATAR_STYLES, generatedAvatarUrl, type AvatarStyle } from "@/lib/avatar";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  DomainError,
  isDuplicateKeyError,
  ok,
  okVoid,
  toActionError,
} from "@/lib/action-helpers";
import type { ActionResult } from "@/types";

export async function signOut(): Promise<void> {
  await clearSessionCookie();
  revalidatePath("/", "layout");
  redirect("/");
}

/** Update account-only preferences. None of these fields are exposed publicly. */
export async function updateAccountPreferences(raw: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const input = accountPreferencesSchema.parse(raw);
    await connectToDatabase();

    const preferences = {
      gender: input.gender,
      defaultLocation: {
        scope: input.defaultLocation.scope,
        country: input.defaultLocation.country || undefined,
        region: input.defaultLocation.region || undefined,
        city: input.defaultLocation.city || undefined,
      },
      ...(input.phone ? { phone: input.phone } : {}),
    };
    await User.updateOne(
      { _id: objectId(user.id) },
      input.phone
        ? { $set: preferences }
        : { $set: preferences, $unset: { phone: 1 } },
    ).exec();

    revalidatePath("/settings");
    return okVoid("Account preferences saved.");
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * Permanently removes the account and private account records. Posts,
 * solutions, and comments stay in the community but are made anonymous, so
 * discussion threads and aggregate counts do not break.
 */
export async function deleteOwnAccount(raw: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    deleteAccountSchema.parse(raw);
    const userId = objectId(user.id);
    await connectToDatabase();

    // Saved problems are private, so remove them and keep their public
    // aggregate counter accurate before the account itself disappears.
    const bookmarks = await ProblemBookmark.find(
      { userId },
      { _id: 1, problemId: 1 },
    ).lean().exec();
    const bookmarkDeltas = new Map<string, number>();
    for (const bookmark of bookmarks) {
      const id = String(bookmark.problemId);
      bookmarkDeltas.set(id, (bookmarkDeltas.get(id) ?? 0) - 1);
    }

    await Promise.all([
      Problem.updateMany({ authorId: userId }, { $set: { isAnonymous: true } }).exec(),
      Solution.updateMany({ authorId: userId }, { $set: { isAnonymous: true } }).exec(),
      Comment.updateMany({ authorId: userId }, { $set: { isAnonymous: true } }).exec(),
      ProblemBookmark.deleteMany({ userId }).exec(),
      Passkey.deleteMany({ userId }).exec(),
      Notification.deleteMany({ $or: [{ userId }, { actorId: userId }] }).exec(),
      Report.deleteMany({ $or: [{ reporterId: userId }, { targetType: "user", targetId: userId }] }).exec(),
    ]);
    if (bookmarkDeltas.size > 0) {
      await Problem.bulkWrite(
        Array.from(bookmarkDeltas, ([id, delta]) => ({
          updateOne: {
            filter: { _id: objectId(id) },
            update: { $inc: { bookmarkCount: delta } },
          },
        })) as never[],
      );
    }
    await User.deleteOne({ _id: userId }).exec();
    await clearSessionCookie();

    revalidatePath("/", "layout");
    return okVoid("Your account has been deleted.");
  } catch (error) {
    return toActionError(error);
  }
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
      dateOfBirth: 1,
    })
      .lean()
      .exec();

    const changingUsername = current?.username !== input.username;

    if (changingUsername) {
      if (current?.usernameChangedAt) {
        throw new DomainError(
          "You've already changed your username once, it can only be changed one time."
        );
      }
      if (isReservedUsername(input.username)) {
        throw new DomainError("That username is reserved. Pick another.");
      }
    }

    // A date of birth is permanent from the moment it is first saved. The
    // form disables the field once set, but the server never trusts that
    // alone, an existing value is never overwritten.
    const settingDateOfBirth = !current?.dateOfBirth && Boolean(input.dateOfBirth);

    try {
      await User.updateOne(
        { _id: objectId(user.id) },
        {
          $set: {
            name: stripUnsafe(input.name),
            username: input.username,
            bio: input.bio ? stripUnsafe(input.bio) : undefined,
            socialLinks: input.socialLinks
              ? Object.fromEntries(
                  Object.entries(input.socialLinks)
                    .filter(([, handle]) => handle)
                    .map(([platform, handle]) => [platform, stripUnsafe(handle)])
                )
              : undefined,
            ...(changingUsername ? { usernameChangedAt: new Date() } : {}),
            ...(settingDateOfBirth
              ? { dateOfBirth: new Date(input.dateOfBirth as string) }
              : {}),
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

export async function generateAnonymousUsername(): Promise<ActionResult<{ username: string }>> {
  try {
    const user = await requireUser();
    await enforceRateLimit("username:generate", user.id);
    await connectToDatabase();

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const username = randomAnonymousUsername();
      const exists = await User.exists({ username });
      if (!exists) return ok({ username });
    }

    throw new DomainError("Could not find an available username. Please try again.");
  } catch (error) {
    return toActionError(error);
  }
}

const avatarInputSchema = z.object({
  avatarType: z.enum(["google", "generated", "uploaded"]),
  avatarStyle: z.enum(AVATAR_STYLES).optional(),
  avatarSeed: z.string().trim().min(1).max(120).optional(),
  avatarUrl: z.string().url().max(2000).optional(),
});

export async function updateAvatar(
  raw: unknown
): Promise<ActionResult<{ avatar: string }>> {
  try {
    const user = await requireUser();
    const input = avatarInputSchema.parse(raw);
    await connectToDatabase();
    const current = await User.findById(objectId(user.id), {
      avatarSeed: 1,
      avatarStyle: 1,
      googleAvatarUrl: 1,
    })
      .lean()
      .exec();

    const avatarSeed = input.avatarSeed ?? current?.avatarSeed ?? user.id;
    const avatarStyle = (input.avatarStyle ?? current?.avatarStyle ?? "people") as AvatarStyle;
    let avatar: string;
    let uploadedAvatarUrl: string | undefined;

    if (input.avatarType === "google") {
      avatar = current?.googleAvatarUrl ?? "";
      if (!avatar) throw new DomainError("Your Google account does not have a profile photo.");
    } else if (input.avatarType === "uploaded") {
      if (!input.avatarUrl) throw new DomainError("Choose a photo to upload first.");
      avatar = input.avatarUrl;
      uploadedAvatarUrl = input.avatarUrl;
    } else {
      avatar = generatedAvatarUrl(avatarSeed, avatarStyle);
    }

    const avatarFields = {
      avatar,
      avatarType: input.avatarType,
      avatarStyle,
      avatarSeed,
      ...(uploadedAvatarUrl ? { avatarUrl: uploadedAvatarUrl } : {}),
    };

    await User.updateOne(
      { _id: objectId(user.id) },
      {
        $set: avatarFields,
      }
    ).exec();

    revalidatePath("/", "layout");
    revalidatePath("/settings");
    revalidatePath(`/u/${user.username}`);
    return ok({ avatar }, "Avatar updated.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function completeOnboarding(
  raw: unknown
): Promise<ActionResult<{ username: string }>> {
  try {
    const user = await requireUser();
    const input = onboardingSchema.parse(raw);
    await connectToDatabase();

    const current = await User.findById(objectId(user.id), {
      dateOfBirth: 1,
      onboardedAt: 1,
    })
      .lean()
      .exec();

    if (current?.onboardedAt ?? current?.dateOfBirth) {
      throw new DomainError("Your account setup is already complete.");
    }
    if (isReservedUsername(input.username)) {
      throw new DomainError("That username is reserved. Pick another.");
    }

    try {
      // The initial read above owns the "already complete" response. Write
      // directly through MongoDB and use its acknowledgement instead of a
      // hydrated document: legacy user records can omit fields Mongoose
      // expects, but must still be able to finish this one-time setup.
      const result = await User.collection.updateOne(
        { _id: objectId(user.id) },
        {
          $set: {
            username: input.username,
            onboardedAt: new Date(),
          },
          $currentDate: { updatedAt: true },
        }
      );

      if (!result.acknowledged || result.matchedCount !== 1) {
        throw new DomainError("We couldn't complete account setup. Please try again.");
      }
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new DomainError("That username is already taken.", "duplicate");
      }
      throw error;
    }

    revalidatePath("/", "layout");
    revalidatePath(`/u/${input.username}`);
    return ok({ username: input.username }, "Your profile is ready.");
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * Live availability check for the username field — called on every keystroke
 * (debounced client-side). Kept cheap: one indexed lookup, no writes.
 */
export async function checkUsernameAvailable(
  raw: unknown
): Promise<ActionResult<{ available: boolean; reason?: string }>> {
  try {
    const user = await requireUser();
    await enforceRateLimit("username:check", user.id);
    const { username } = checkUsernameSchema.parse(raw);

    const current = await (async () => {
      await connectToDatabase();
      return User.findById(objectId(user.id), { username: 1 }).lean().exec();
    })();

    if (current?.username === username) {
      return ok({ available: true });
    }

    if (isReservedUsername(username)) {
      return ok({ available: false, reason: "That username is reserved." });
    }

    const taken = await User.exists({ username });

    return ok({
      available: !taken,
      reason: taken ? "That username is already taken." : undefined,
    });
  } catch (error) {
    return toActionError(error);
  }
}
