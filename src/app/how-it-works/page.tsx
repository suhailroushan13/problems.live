import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CircleDollarSign, MessageCircle, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "How Score and Credits work",
  description:
    "Understand Score (reputation) and Credits (posting currency) on problems.live: what they mean and how they work.",
  alternates: { canonical: "/how-it-works" },
};

const REPUTATION_SIGNALS = [
  "Someone validates a problem you shared.",
  "Someone marks your solution or comment helpful.",
  "A problem you posted gets solved or your solution is accepted.",
];

const CREDIT_RULES = [
  "Sharing a new problem costs one Credit; voting, commenting, and proposing solutions are free.",
  "When a problem you posted receives enough validations, you earn Credits back automatically.",
  "If a moderator removes a problem, its Credit is returned to you.",
];

export default function HowItWorksPage() {
  return (
    <div className="page py-12 sm:py-16">
      <header className="max-w-2xl">
        <p className="label text-brand">How the community stays useful</p>
        <h1 className="mt-2 text-[2rem] font-bold tracking-[-0.035em] text-foreground sm:text-[2.75rem]">
          Score earns trust. Credits are posting currency.
        </h1>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted-foreground">
          Neither is money. They are simple signals that reward useful
          contributions and give every new problem a small reason to be worth
          someone&apos;s time.
        </p>
      </header>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5">
        <section className="rounded-xl border border-hairline bg-elevated p-5 sm:p-6">
          <span className="flex size-10 items-center justify-center rounded-lg bg-brand-muted text-brand">
            <BadgeCheck className="size-5" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-lg font-bold tracking-[-0.02em] text-foreground">
            Score
          </h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
            Score is your reputation: a running record of how people respond to
            your work. It rises only when other people find what you shared useful.
          </p>
          <ul className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
            {REPUTATION_SIGNALS.map((signal) => (
              <li key={signal} className="flex gap-2.5">
                <ThumbsUp className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                <span>{signal}</span>
              </li>
            ))}
          </ul>
          <Button asChild className="mt-6" variant="outline">
            <Link href="/score">
              How Score works <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </section>

        <section className="rounded-xl border border-hairline bg-elevated p-5 sm:p-6">
          <span className="flex size-10 items-center justify-center rounded-lg bg-success-subtle text-success">
            <CircleDollarSign className="size-5" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-lg font-bold tracking-[-0.02em] text-foreground">
            Credits
          </h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
            Credits are the posting currency. One Credit lets you share one new
            problem; voting, comments, and solutions never cost Credits.
          </p>
          <ul className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
            {CREDIT_RULES.map((rule) => (
              <li key={rule} className="flex gap-2.5">
                <MessageCircle className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
          <Button asChild className="mt-6" variant="outline">
            <Link href="/credits">
              How Credits work <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
