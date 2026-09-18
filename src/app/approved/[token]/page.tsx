import { createHash } from "node:crypto";
import { notFound } from "next/navigation";
import { ApprovalConfirmer } from "@/components/waitlist/approval-confirmer";
import { connectToDatabase } from "@/lib/db/mongoose";
import { User } from "@/models";

export default async function ApprovedPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) notFound();
  await connectToDatabase();

  const approvedUser = await User.findOne(
    { waitlistApprovalTokenHash: createHash("sha256").update(token).digest("hex") },
    { name: 1 },
  )
    .lean()
    .exec();
  if (!approvedUser) notFound();

  return (
    <main className="page flex min-h-[calc(100svh-12rem)] items-center py-12">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-hairline bg-card p-7 shadow-sm">
        <p className="label text-brand">You&apos;re approved</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Welcome, {approvedUser.name}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Your problems.live access is ready. Continue below to sign in with Google and start posting.
        </p>
        <div className="mt-7">
          <ApprovalConfirmer />
        </div>
      </section>
    </main>
  );
}
