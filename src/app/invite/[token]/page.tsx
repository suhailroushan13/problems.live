import { createHash } from "node:crypto";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Invite } from "@/models";
import { User } from "@/models";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) notFound();
  await connectToDatabase();
  const invite = await Invite.findOne({ tokenHash: createHash("sha256").update(token).digest("hex"), status: "pending" }, { name: 1, email: 1 }).lean().exec();
  if (!invite) notFound();
  const user = await getCurrentUser();
  const next = `/invite/${token}`;

  // Email invitations already establish intent: the recipient followed their
  // personal link and has verified ownership of that inbox with Google. Do
  // the acceptance atomically here instead of asking them to confirm again.
  if (!user) redirect(`/api/auth/google?next=${encodeURIComponent(next)}`);

  if (user.email === invite.email) {
    const claimed = await Invite.findOneAndUpdate(
      { _id: invite._id, status: "pending", email: user.email },
      { $set: { status: "accepted", claimedBy: user.id, claimedAt: new Date() } },
      { new: true },
    ).lean().exec();
    if (!claimed) notFound();

    await User.updateOne(
      { _id: user.id },
      { $set: { inviteCredits: 5, invitedBy: claimed.inviterId ?? null } },
      { strict: false },
    ).exec();

    redirect("/problems/new");
  }

  return <main className="page flex min-h-[calc(100svh-12rem)] items-center py-12"><section className="mx-auto w-full max-w-md rounded-2xl border border-hairline bg-card p-7 shadow-sm"><p className="label text-brand">Invitation email mismatch</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Use the invited account.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">This invitation was sent to {invite.email}. Continue with that Google account to join.</p><Button asChild variant="outline" className="mt-7 w-full"><Link href={`/api/auth/google?next=${encodeURIComponent(next)}`}>Choose another Google account</Link></Button></section></main>;
}
