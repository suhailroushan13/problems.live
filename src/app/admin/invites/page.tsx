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
  return <div><div className="max-w-2xl"><p className="label text-brand">Invitation desk</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Send an invitation</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Invite someone by name and email. Accepted invites receive five invitations of their own.</p><section className="mt-7 rounded-2xl border border-hairline bg-card p-6"><InviteForm credits={user?.inviteCredits ?? 0} admin /></section></div><div className="mt-10"><InvitationTraceCanvas nodes={nodes} edges={edges} /></div></div>;
}
