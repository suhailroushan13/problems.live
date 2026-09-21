import { createHash } from "node:crypto";
import { env } from "@/lib/env";

/** Only the hash is ever persisted — the raw token/code is shown once, at creation. */
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * The link an invitation email should use. It skips the invite landing page
 * entirely and drops the person straight onto Google's consent screen —
 * `hasInviteAccess` recognises this `next` path and lets a first-time
 * sign-in through, landing them back on `/invite/{token}` already
 * authenticated and one click from posting.
 */
export function googleAuthUrlForInvite(token: string): string {
  return `${env.appUrl}/api/auth/google?next=${encodeURIComponent(`/invite/${token}`)}`;
}

/** A recipient-controlled page which cancels a pending, email-specific invite. */
export function invitationUnsubscribeUrl(token: string): string {
  return `${env.appUrl}/unsubscribe/invitation/${token}`;
}

/** RFC 8058 one-click unsubscribe endpoint used by supporting inbox providers. */
export function invitationUnsubscribeApiUrl(token: string): string {
  return `${env.appUrl}/api/invites/unsubscribe?token=${encodeURIComponent(token)}`;
}
