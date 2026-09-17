import { redirect } from "next/navigation";
import { InviteForm } from "@/components/invites/invite-form";
import { getCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongoose";
import { User } from "@/models";
import { toObjectId } from "@/lib/utils/sanitize-query";

export default async function InvitesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/wait-list");
  await connectToDatabase();
  const account = await User.findById(toObjectId(user.id), { inviteCredits: 1 }).lean().exec();
  const inviteCredits = account?.inviteCredits ?? 0;
  return <main className="page max-w-2xl py-12"><p className="label text-brand">Your network</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Invite people you trust</h1><p className="mt-3 text-muted-foreground">Every accepted invitation expands the community carefully.</p><section className="mt-8 rounded-2xl border border-hairline bg-card p-6"><InviteForm credits={inviteCredits} /></section></main>;
}
