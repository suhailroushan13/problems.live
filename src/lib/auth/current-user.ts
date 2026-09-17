import "server-only";
import { cache } from "react";
import { connectToDatabase } from "@/lib/db/mongoose";
import { User, type IUser } from "@/models";
import { toObjectId } from "@/lib/utils/sanitize-query";
import { readSessionUserId } from "./session";
import {
  TRUST_TIERS,
  type AccountGender,
  type LocationScope,
  type TrustTier,
  type UserRole,
} from "@/lib/constants";

/**
 * The single source of truth for "who is asking". Role, reputation and
 * suspension are always re-read from the database — never from the cookie,
 * never from the client.
 */
export interface SessionUser {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  /** Private preferences are available only to server-rendered account flows. */
  phone?: string;
  gender: AccountGender;
  defaultLocation: {
    scope: LocationScope;
    country?: string;
    region?: string;
    city?: string;
  };
  role: UserRole;
  reputation: number;
  problemCredits: number;
  inviteCredits: number;
  trust: TrustTier;
  isAdmin: boolean;
  isModerator: boolean;
  isSuspended: boolean;
  suspendedUntil: Date | null;
}

export function trustTierFor(reputation: number): TrustTier {
  let tier: TrustTier = "new";
  for (const t of TRUST_TIERS) {
    if (reputation >= t.minReputation) tier = t.key;
  }
  return tier;
}

function toSessionUser(doc: IUser): SessionUser {
  const suspendedUntil = doc.suspendedUntil ?? null;
  const stillSuspended =
    doc.status === "suspended" &&
    (!suspendedUntil || suspendedUntil.getTime() > Date.now());

  return {
    id: String(doc._id),
    name: doc.name,
    username: doc.username,
    email: doc.email,
    avatar: doc.avatar,
    phone: doc.phone,
    gender: doc.gender ?? "not_specified",
    defaultLocation: doc.defaultLocation ?? { scope: "global" },
    role: doc.role,
    reputation: doc.reputation,
    problemCredits: doc.problemCredits,
    inviteCredits: doc.inviteCredits ?? 0,
    trust: trustTierFor(doc.reputation),
    isAdmin: doc.role === "admin",
    isModerator: doc.role === "admin" || doc.role === "moderator",
    isSuspended: stillSuspended,
    suspendedUntil,
  };
}

/** Request-scoped: React `cache` dedupes this across an entire render tree. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const userId = await readSessionUserId();
  if (!userId) return null;

  const objectId = toObjectId(userId);
  if (!objectId) return null;

  await connectToDatabase();
  const doc = await User.findById(objectId).lean<IUser>().exec();
  if (!doc) return null;

  return toSessionUser(doc);
});

export class AuthError extends Error {
  constructor(message = "You need to sign in to do that.") {
    super(message);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError();
  if (user.isSuspended) {
    throw new ForbiddenError(
      "Your account is suspended and cannot post right now."
    );
  }
  return user;
}

export async function requireModerator(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isModerator) throw new ForbiddenError();
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isAdmin) throw new ForbiddenError();
  return user;
}
