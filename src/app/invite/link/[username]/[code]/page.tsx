import { notFound, redirect } from "next/navigation";
import { Types } from "mongoose";
import { getCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongoose";
import { hashInviteToken } from "@/lib/utils/invite-token";
import { inviteLinkCodeSchema, usernameSchema } from "@/lib/validation/schemas";
import { Invite, User } from "@/models";

export default async function InviteLinkPage({
  params,
}: {
  params: Promise<{ username: string; code: string }>;
}) {
  const raw = await params;
  const username = usernameSchema.safeParse(raw.username);
  const code = inviteLinkCodeSchema.safeParse(raw.code);
  if (!username.success || !code.success) notFound();

  await connectToDatabase();
  const next = `/invite/link/${username.data}/${code.data}`;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/api/auth/google?next=${encodeURIComponent(next)}`);
  }
  const claimantId = new Types.ObjectId(user.id);

  const invite = await Invite.findOne(
    {
      tokenHash: hashInviteToken(code.data),
      type: "link",
      status: "pending",
      inviterUsername: username.data,
      $expr: { $lt: [{ $ifNull: ["$usedCount", 0] }, { $ifNull: ["$maxUses", 1] }] },
    },
    { inviterId: 1 },
  ).lean().exec();
  if (!invite) notFound();

  // A member may open their own share link. They already have access, so do
  // not consume the invitation; simply take them to the compose page.
  if (String(invite.inviterId) === user.id) {
    redirect("/problems/new");
  }
  if (invite.claimedByIds?.some((claimedBy) => String(claimedBy) === user.id)) {
    redirect("/problems/new");
  }

  // This covers an already signed-in recipient. New recipients are claimed
  // in the OAuth callback above, before onboarding starts.
  const claimTime = new Date();
  const claimed = await Invite.findOneAndUpdate(
    {
      _id: invite._id,
      status: "pending",
      claimedByIds: { $ne: claimantId },
      $expr: { $lt: [{ $ifNull: ["$usedCount", 0] }, { $ifNull: ["$maxUses", 1] }] },
    },
    [
      {
        $set: {
          usedCount: { $add: [{ $ifNull: ["$usedCount", 0] }, 1] },
          claimedBy: claimantId,
          claimedByIds: { $concatArrays: [{ $ifNull: ["$claimedByIds", []] }, [claimantId]] },
          claimedAt: claimTime,
          status: {
            $cond: [
              {
                $gte: [
                  { $add: [{ $ifNull: ["$usedCount", 0] }, 1] },
                  { $ifNull: ["$maxUses", 1] },
                ],
              },
              "accepted",
              "pending",
            ],
          },
        },
      },
    ],
    { new: true },
  ).lean().exec();
  if (!claimed) notFound();

  await User.updateOne(
    { _id: user.id },
    { $set: { inviteCredits: 5, invitedBy: claimed.inviterId ?? null } },
    { strict: false },
  ).exec();

  redirect("/onboard?next=/problems/new");
}
