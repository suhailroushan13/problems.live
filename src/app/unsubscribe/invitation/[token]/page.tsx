import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invitation email preferences",
  robots: { index: false, follow: false },
};

function validToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{20,}$/.test(token);
}

export default async function InvitationUnsubscribePage({
  params,
  searchParams,
}: PageProps<"/unsubscribe/invitation/[token]">) {
  const { token } = await params;
  const { status } = await searchParams;
  const isValid = validToken(token);
  const cancelled = status === "unsubscribed";

  return (
    <main className="page flex min-h-[calc(100svh-12rem)] items-center py-12">
      <section className="mx-auto w-full max-w-lg rounded-2xl border border-hairline bg-card p-7 shadow-sm sm:p-9">
        <p className="label text-brand">Email preferences</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {cancelled ? "Invitation cancelled" : "Stop invitation emails"}
        </h1>
        {cancelled ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Your pending invitation has been cancelled. We won&apos;t send further messages about this invitation.
          </p>
        ) : isValid ? (
          <>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              This will cancel the pending invitation associated with this email. You can request a new invitation later if you change your mind.
            </p>
            <form action="/api/invites/unsubscribe" method="post" className="mt-7">
              <input type="hidden" name="token" value={token} />
              <button type="submit" className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-hover">
                Cancel this invitation
              </button>
            </form>
          </>
        ) : (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">This unsubscribe link is invalid or has expired.</p>
        )}
      </section>
    </main>
  );
}
