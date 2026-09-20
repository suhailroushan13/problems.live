import type { Metadata } from "next";
import { cookies } from "next/headers";
import { WaitlistCard } from "./waitlist-card";
import { Button } from "@/components/ui/button";
import { XIcon } from "@/components/shared/social-icons";
import { ACCESS_CONTACT_X_URL } from "@/lib/constants";
import { issueRenderProof } from "@/lib/utils/waitlist-proof";

export const metadata: Metadata = {
  title: "Private beta",
  description: "problems.live is currently invite-only. Join the waitlist or get instant access on X.",
  robots: { index: false, follow: false },
};

// The anti-bot render proof is minted fresh per request — this page must
// never be statically cached, or every visitor would share one stale token.
export const dynamic = "force-dynamic";

const PENDING_PROFILE_COOKIE = "pl_pending_profile";

/** Set by the Google callback when a first-time sign-in has no invite yet — carries their name/email over so they don't retype what Google already gave us. */
async function pendingProfile(): Promise<{ name: string; email: string } | null> {
  const raw = (await cookies()).get(PENDING_PROFILE_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { name?: unknown; email?: unknown };
    if (typeof parsed.name !== "string" || typeof parsed.email !== "string") return null;
    return { name: parsed.name, email: parsed.email };
  } catch {
    return null;
  }
}

export default async function WaitListPage() {
  const proof = issueRenderProof();
  const prefill = await pendingProfile();

  return (
    <main className="page py-8 sm:py-12">
      <div className="mx-auto max-w-xl text-center">
        <p className="label text-brand">Private beta</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          problems.live is <span className="text-brand">invite-only</span>.
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground sm:text-base">
          We&apos;re opening problems.live gradually to people who want to share, validate, and solve real-world problems.
        </p>
      </div>

      <div className="relative mx-auto mt-8 grid max-w-3xl gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5">
        <section className="flex flex-col rounded-xl border border-hairline bg-sunken p-6">
          <div>
            <h2 className="text-base font-semibold text-foreground sm:text-lg">Get instant access</h2>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              Want to get in now? Message the founder on X and ask for an invite.
            </p>
          </div>
          <div className="mt-6 sm:mt-auto sm:pt-6">
            <Button asChild className="w-full border-black bg-black text-white hover:bg-neutral-800">
              <a href={ACCESS_CONTACT_X_URL} target="_blank" rel="noopener noreferrer">
                Reach out on
                <XIcon className="size-4" />
              </a>
            </Button>
            <p className="mt-2.5 text-center text-xs text-muted-foreground">
              Usually the fastest way to get access.
            </p>
          </div>
        </section>

        {/* Mobile: horizontal "or" divider between the stacked cards. */}
        <div aria-hidden="true" className="flex items-center gap-3 sm:hidden">
          <span className="h-px flex-1 bg-hairline" />
          <span className="text-xs font-medium text-muted-foreground">OR</span>
          <span className="h-px flex-1 bg-hairline" />
        </div>

        {/* Desktop: small "or" badge floating in the gap between the two columns. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden items-center justify-center sm:flex">
          <span className="rounded-full border border-hairline bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
            OR
          </span>
        </div>

        <section className="rounded-xl border border-hairline bg-card p-6">
          <h2 className="text-base font-semibold text-foreground sm:text-lg">Join the waitlist</h2>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            Leave your details and we&apos;ll let you know when an invite is available.
          </p>
          <WaitlistCard
            issuedAt={proof.issuedAt}
            token={proof.token}
            defaultName={prefill?.name}
            defaultEmail={prefill?.email}
          />
        </section>
      </div>
    </main>
  );
}
