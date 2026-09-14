import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import { User, type IUser } from "@/models";
import { usernameFromEmail } from "@/lib/utils/slug";
import { env } from "@/lib/env";
import { getSetting } from "@/lib/config/settings";
import { isReservedUsername } from "@/lib/constants";
import type { GoogleProfile } from "./google";

async function claimUsername(seed: string): Promise<string> {
  const base = seed || "user";
  // Try the plain handle first, then deterministic suffixes. Reserved words
  // are skipped the same way a taken username is — someone signing in with
  // admin@... must never auto-claim @admin. The unique index is the real
  // guard against collisions with other people; this just avoids most of
  // them, and reserved words, up front.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}${attempt + 1}`;
    if (isReservedUsername(candidate)) continue;
    const exists = await User.exists({ username: candidate });
    if (!exists) return candidate;
  }
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Find-or-create the local account behind a verified Google identity.
 * Matching falls back to email so a user who somehow gets a new Google `sub`
 * does not end up with a duplicate account.
 */
export async function provisionUserFromGoogle(
  profile: GoogleProfile
): Promise<IUser> {
  await connectToDatabase();

  const existing = await User.findOne({
    $or: [{ googleId: profile.googleId }, { email: profile.email }],
  }).exec();

  const shouldBeAdmin = env.adminEmails.includes(profile.email);

  if (existing) {
    existing.googleId = profile.googleId;
    existing.email = profile.email;
    existing.emailVerified = profile.emailVerified;
    existing.name = profile.name;
    // Only refresh the avatar while the user is still on their Google picture.
    if (profile.picture && (!existing.avatar || existing.avatar.includes("googleusercontent.com"))) {
      existing.avatar = profile.picture;
    }
    if (shouldBeAdmin && existing.role !== "admin") existing.role = "admin";
    existing.lastSeenAt = new Date();
    await existing.save();
    return existing.toObject() as IUser;
  }

  const startingCredits = await getSetting("startingProblemCredits");
  const username = await claimUsername(usernameFromEmail(profile.email));

  const created = await User.create({
    googleId: profile.googleId,
    email: profile.email,
    emailVerified: profile.emailVerified,
    name: profile.name,
    username,
    avatar: profile.picture,
    role: shouldBeAdmin ? "admin" : "user",
    reputation: 0,
    problemCredits: startingCredits,
    lastSeenAt: new Date(),
  });

  return created.toObject() as IUser;
}
