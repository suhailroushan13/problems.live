import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import { hashInviteToken } from "@/lib/utils/invite-token";
import { inviteLinkCodeSchema, usernameSchema } from "@/lib/validation/schemas";
import { Invite } from "@/models";

const EMAIL_INVITE_PATH = /^\/invite\/([A-Za-z0-9_-]{20,128})$/;
const LINK_INVITE_PATH = /^\/invite\/link\/([^/]+)\/([^/]+)$/;

/**
 * A pending, unclaimed invite grants the same sign-in access as a waitlist
 * approval — otherwise someone with a legitimate invite link would still be
 * bounced to /wait-list on their first Google sign-in. Only reachable via a
 * `next` path shaped like an invite URL; anything else returns false.
 */
export async function hasInviteAccess(next: string, email: string): Promise<boolean> {
  const emailMatch = next.match(EMAIL_INVITE_PATH);
  if (emailMatch) {
    await connectToDatabase();
    return Boolean(
      await Invite.exists({
        tokenHash: hashInviteToken(emailMatch[1]),
        type: "email",
        status: "pending",
        email: email.toLowerCase(),
      }),
    );
  }

  const linkMatch = next.match(LINK_INVITE_PATH);
  if (linkMatch) {
    const username = usernameSchema.safeParse(linkMatch[1]);
    const code = inviteLinkCodeSchema.safeParse(linkMatch[2]);
    if (!username.success || !code.success) return false;

    await connectToDatabase();
    return Boolean(
      await Invite.exists({
        tokenHash: hashInviteToken(code.data),
        type: "link",
        status: "pending",
        inviterUsername: username.data,
      }),
    );
  }

  return false;
}
