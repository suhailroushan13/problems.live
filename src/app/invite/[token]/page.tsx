import { createHash } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AcceptInviteButton } from "@/components/invites/accept-invite-button";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Invite } from "@/models";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) notFound();
  await connectToDatabase();
  const invite = await Invite.findOne({ tokenHash: createHash("sha256").update(token).digest("hex"), status: "pending" }, { name: 1, email: 1 }).lean().exec();
  if (!invite) notFound();
  const user = await getCurrentUser();
  const matchesEmail = user?.email === invite.email;
  return <main className="page flex min-h-[calc(100svh-12rem)] items-center py-12"><section className="mx-auto w-full max-w-md rounded-2xl border border-hairline bg-card p-7 shadow-sm"><p className="label text-brand">Private invitation</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Welcome, {invite.name}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">You&apos;ve been invited to problems.live. Once you join, you&apos;ll have five invitations to share with people you trust.</p>{!user ? <Button asChild className="mt-7 w-full"><a href={`/api/auth/google?next=${encodeURIComponent(`/invite/${token}`)}`}>Continue with Google</a></Button> : matchesEmail ? <div className="mt-7"><AcceptInviteButton token={token} /></div> : <div className="mt-7"><p className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">Sign in with the email address this invitation was sent to.</p><Button asChild variant="outline" className="mt-4 w-full"><Link href={`/api/auth/google?next=${encodeURIComponent(`/invite/${token}`)}`}>Choose another Google account</Link></Button></div>}</section></main>;
}
