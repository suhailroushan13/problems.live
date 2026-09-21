import { InviteForm } from "@/components/invites/invite-form";
import { InvitationTraceCanvas, type TraceNode } from "@/components/invites/invitation-trace-canvas";
import { getCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Invite, User } from "@/models";

export default async function AdminInvitesPage() {
  const user = await getCurrentUser();
  await connectToDatabase();
  const invites = await Invite.find({}, { name: 1, email: 1, inviterId: 1, inviterUsername: 1, claimedBy: 1, status: 1 }).sort({ createdAt: 1 }).lean().exec();
  // Every user is a node, not just ones already linked by an Invite — someone
  // who joined directly from the website (never sent or received an invite)
  // still belongs on the map as their own root.
  const people = await User.find({}, { name: 1, email: 1, inviteCredits: 1 }).sort({ createdAt: 1 }).lean().exec();
  const nodes: TraceNode[] = people.map((person) => ({ id: `user:${person._id}`, label: person.name, email: person.email, credits: person.inviteCredits ?? 0, pending: false }));
  const edges = invites.flatMap((invite) => {
    if (!invite.inviterId) return [];
    const target = invite.claimedBy ? `user:${invite.claimedBy}` : `invite:${invite._id}`;
    if (!invite.claimedBy) nodes.push({ id: target, label: invite.name ?? `${invite.inviterUsername ?? "someone"}'s invite link`, email: invite.email ?? "", pending: true });
    return [{ from: `user:${invite.inviterId}`, to: target }];
  });
  return <div className="max-w-[88rem]">
    <section className="grid gap-8 border-b border-hairline pb-9 lg:grid-cols-[minmax(0,1fr)_27rem] lg:items-end">
      <div>
        <p className="label text-brand">Invitation desk</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-4xl">Grow the network with intent.</h2>
        <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">Every accepted invitation creates a visible line of trust. Send a personal invitation, then follow the community it builds.</p>
      </div>
      <section className="rounded-2xl border border-brand-border bg-brand-muted/45 p-5 shadow-[0_12px_32px_rgb(37_99_235/0.08)]">
        <p className="text-sm font-semibold text-foreground">Send an invitation</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">A personal note, a single connection at a time.</p>
        <div className="mt-4"><InviteForm credits={user?.inviteCredits ?? 0} admin /></div>
      </section>
    </section>
    <div className="mt-8"><InvitationTraceCanvas nodes={nodes} edges={edges} /></div>
  </div>;
}
