"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { DomainError, isDuplicateKeyError, okVoid, toActionError } from "@/lib/action-helpers";
import { requireUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongoose";
import { env } from "@/lib/env";
import { sendInvitationEmail } from "@/lib/services/email";
import { inviteSchema } from "@/lib/validation/schemas";
import { Invite, User } from "@/models";
import type { ActionResult } from "@/types";

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

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
