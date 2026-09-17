import type { Metadata } from "next";
import { WaitlistForm } from "@/components/forms/waitlist-form";

export const metadata: Metadata = {
  title: "Join the waitlist",
  description: "Request an invite to problems.live.",
  robots: { index: false, follow: false },
};

export default function WaitlistPage() {
  return <main className="page flex min-h-[calc(100svh-12rem)] items-center py-12"><section className="mx-auto w-full max-w-md rounded-2xl border border-hairline bg-card p-6 shadow-sm sm:p-8"><p className="label text-brand">Invite only</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Join problems.live</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">We&apos;re opening in small groups. Leave your details and we&apos;ll let you know when your invite is ready.</p><div className="mt-7"><WaitlistForm /></div></section></main>;
}
