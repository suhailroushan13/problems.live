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
  return <div className="mx-auto flex min-h-0 max-w-[88rem] flex-col gap-5">
    <section className="grid gap-5 rounded-xl border border-hairline bg-elevated p-5 lg:grid-cols-[minmax(0,1fr)_30rem] lg:items-end">
      <div>
        <p className="label text-brand">Invitation desk</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-foreground sm:text-3xl">Invite people you trust.</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Every accepted invite becomes a visible connection in the network below.</p>
      </div>
      <section className="border-t border-hairline pt-5 lg:border-t-0 lg:border-l lg:pl-5 lg:pt-0">
        <p className="text-sm font-semibold text-foreground">Send an invitation</p>
        <div className="mt-3"><InviteForm credits={user?.inviteCredits ?? 0} admin /></div>
      </section>
    </section>
    <InvitationTraceCanvas nodes={nodes} edges={edges} />
  </div>;
}
