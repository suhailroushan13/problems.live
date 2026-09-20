import { notFound } from "next/navigation";
import { AcceptInviteLinkButton } from "@/components/invites/accept-invite-link-button";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getProfileByUsername } from "@/lib/data/users";
import { hashInviteToken } from "@/lib/utils/invite-token";
import { inviteLinkCodeSchema, usernameSchema } from "@/lib/validation/schemas";
import { Invite } from "@/models";

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
  const [invite, inviter] = await Promise.all([
    Invite.findOne(
      { tokenHash: hashInviteToken(code.data), type: "link", status: "pending", inviterUsername: username.data },
      { inviterUsername: 1 },
    ).lean().exec(),
    getProfileByUsername(username.data),
  ]);
  if (!invite || !inviter) notFound();

  const user = await getCurrentUser();
  const isOwnLink = user?.username === username.data;
  const next = `/invite/link/${username.data}/${code.data}`;

  return (
    <main className="page flex min-h-[calc(100svh-12rem)] items-center py-12">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-hairline bg-card p-7 shadow-sm">
        <p className="label text-brand">Personal invitation</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {inviter.name} invited you
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          You&apos;ve been invited to problems.live by u/{inviter.username}. Once you join, you&apos;ll have five
          invitations to share with people you trust.
        </p>
        {!user ? (
          <Button asChild className="mt-7 w-full">
            <a href={`/api/auth/google?next=${encodeURIComponent(next)}`}>Continue with Google</a>
          </Button>
        ) : isOwnLink ? (
          <p className="mt-7 rounded-lg border border-hairline bg-sunken p-3 text-sm text-muted-foreground">
            This is your own invite link — share it with someone else to have them join.
          </p>
        ) : (
          <div className="mt-7">
            <AcceptInviteLinkButton username={username.data} code={code.data} />
          </div>
        )}
      </section>
    </main>
  );
}
