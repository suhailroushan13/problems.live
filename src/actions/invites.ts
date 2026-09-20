"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { DomainError, isDuplicateKeyError, ok, okVoid, toActionError } from "@/lib/action-helpers";
import { requireUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongoose";
import { env } from "@/lib/env";
import { sendInvitationEmail } from "@/lib/services/email";
import { hashInviteToken as tokenHash } from "@/lib/utils/invite-token";
import { inviteLinkCodeSchema, inviteSchema, usernameSchema } from "@/lib/validation/schemas";
import { Invite, User } from "@/models";
import type { ActionResult } from "@/types";

export async function sendInvite(raw: unknown): Promise<ActionResult> {
  try {
    const inviter = await requireUser();
    const input = inviteSchema.parse(raw);
    await connectToDatabase();
    if (inviter.inviteCredits < 1) {
      throw new DomainError("You have no invitations remaining.", "forbidden");
    }
    if (input.email === inviter.email) throw new DomainError("You can’t invite your own email address.");
    if (await User.exists({ email: input.email })) throw new DomainError("This email already has an account.");
    if (await Invite.exists({ email: input.email, status: "pending" })) {
      throw new DomainError("This email already has a pending invitation.");
    }

    const token = randomBytes(32).toString("base64url");
    try {
      await Invite.create({
        ...input,
        type: "email",
        tokenHash: tokenHash(token),
        inviterId: inviter.id,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) throw new DomainError("This email already has a pending invitation.");
      throw error;
    }
    await User.updateOne(
      { _id: inviter.id },
      { $inc: { inviteCredits: -1 } },
      { strict: false },
    ).exec();
    await sendInvitationEmail({ name: input.name, email: input.email, inviteUrl: `${env.appUrl}/invite/${token}` });
    revalidatePath("/admin/invites");
    revalidatePath("/invites");
    return okVoid("Invitation sent.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function acceptInvite(token: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) throw new DomainError("This invitation link is invalid.");
    await connectToDatabase();
    const invite = await Invite.findOneAndUpdate(
      { tokenHash: tokenHash(token), status: "pending", email: user.email },
      { $set: { status: "accepted", claimedBy: user.id, claimedAt: new Date() } },
      { new: true },
    ).lean().exec();
    if (!invite) throw new DomainError("This invitation is unavailable or belongs to another email address.", "forbidden");
    // `strict: false` also makes this safe during a hot reload where Mongoose
    // still holds the previous User schema without invitation fields.
    await User.updateOne(
      { _id: user.id },
      { $set: { inviteCredits: 5, invitedBy: invite.inviterId ?? null } },
      { strict: false },
    ).exec();
    revalidatePath("/invites");
    return okVoid("Invitation accepted. You now have 5 invitations to share.");
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * A personal, shareable, single-use link: `/invite/link/{username}/{code}`.
 * Unlike `sendInvite`, it isn't tied to a specific email address — anyone
 * with the link can claim it, once.
 */
export async function createInviteLink(): Promise<ActionResult<{ url: string }>> {
  try {
    const inviter = await requireUser();
    await connectToDatabase();
    if (inviter.inviteCredits < 1) {
      throw new DomainError("You have no invitations remaining.", "forbidden");
    }

    const code = randomBytes(8).toString("base64url");
    await Invite.create({
      type: "link",
      tokenHash: tokenHash(code),
      inviterId: inviter.id,
      inviterUsername: inviter.username,
    });
    await User.updateOne(
      { _id: inviter.id },
      { $inc: { inviteCredits: -1 } },
      { strict: false },
    ).exec();
    revalidatePath("/invites");
    return ok(
      { url: `${env.appUrl}/invite/link/${inviter.username}/${code}` },
      "Invite link created. Copy it now — it won’t be shown again.",
    );
  } catch (error) {
    return toActionError(error);
  }
}

export async function acceptInviteLink(username: string, code: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const safeUsername = usernameSchema.parse(username);
    const safeCode = inviteLinkCodeSchema.parse(code);
    await connectToDatabase();

    const invite = await Invite.findOne({
      tokenHash: tokenHash(safeCode),
      type: "link",
      inviterUsername: safeUsername,
    }).lean().exec();
    if (!invite || invite.status !== "pending") {
      throw new DomainError("This invitation link is unavailable or has already been used.", "forbidden");
    }
    if (invite.inviterId && String(invite.inviterId) === user.id) {
      throw new DomainError("You can’t accept your own invite link.");
    }

    const claimed = await Invite.findOneAndUpdate(
      { _id: invite._id, status: "pending" },
      { $set: { status: "accepted", claimedBy: user.id, claimedAt: new Date() } },
      { new: true },
    ).lean().exec();
    if (!claimed) throw new DomainError("This invitation link is unavailable or has already been used.", "forbidden");

    await User.updateOne(
      { _id: user.id },
      { $set: { inviteCredits: 5, invitedBy: invite.inviterId ?? null } },
      { strict: false },
    ).exec();
    revalidatePath("/invites");
    return okVoid("Invitation accepted. You now have 5 invitations to share.");
  } catch (error) {
    return toActionError(error);
  }
}
