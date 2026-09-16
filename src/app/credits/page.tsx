import type { Metadata } from "next";
import Link from "next/link";
import { Gift, RotateCcw, ShieldCheck, Ticket, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getSetting } from "@/lib/config/settings";
import { formatCount } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Problem credits",
  description:
    "How problem credits work on problems.live, how to earn more, and why posting a problem costs one.",
  alternates: { canonical: "/credits" },
};

export default async function CreditsPage() {
  const [user, starting, maxCredits, validationsToEarn, creditsPerValidated] =
    await Promise.all([
      getCurrentUser(),
      getSetting("startingProblemCredits"),
      getSetting("maxProblemCredits"),
      getSetting("validationsToEarnCredit"),
      getSetting("creditsPerValidatedProblem"),
    ]);

  return (
    <div className="page py-12 sm:py-16">
      <header className="mb-10">
        <p className="label text-brand">Problem credits</p>
        <h1 className="mt-2 text-[2rem] font-bold tracking-[-0.035em] text-foreground sm:text-[2.75rem]">
          The cost of posting is one credit
        </h1>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted-foreground">
          Voting, commenting, and proposing solutions are all free. Posting a
          new problem spends one credit, a small cost that keeps the front
          page free of drive-by noise, without ever charging you real money.
        </p>
      </header>

      {user ? (
        <section className="mb-10 rounded-xl border border-brand-border bg-linear-to-b from-brand-muted to-background p-5 sm:p-6">
          <p className="label text-brand">Your credits</p>
          <p className="mt-2 text-[1.75rem] leading-tight font-bold tracking-[-0.025em] text-foreground">
            <span className="num">{formatCount(user.problemCredits)}</span>{" "}
            <span className="font-semibold text-foreground/75">
              of {formatCount(maxCredits)} max
            </span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Enough for {formatCount(user.problemCredits)} more{" "}
            {user.problemCredits === 1 ? "problem" : "problems"} right now.
          </p>
        </section>
      ) : null}

      <section>
        <h2 className="text-[1.0625rem] font-bold tracking-[-0.015em] text-foreground">
          How it works
        </h2>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
          Credits are spent on the attempt, not the outcome, that&apos;s what
          makes them a real cost against spam rather than a paywall. One
          credit is deducted the moment you publish a problem, whether or not
          it ends up going anywhere. Run out, and you can still vote, comment
          and propose solutions on everything already posted, you just
          can&apos;t start a new problem until you earn one back.
        </p>
      </section>

      <section className="mt-10 border-t border-hairline pt-8">
        <h2 className="text-[1.0625rem] font-bold tracking-[-0.015em] text-foreground">
          How to get more
        </h2>
        <div className="mt-4 space-y-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-sunken text-muted-foreground">
              <Gift className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                New accounts start with {formatCount(starting)}
              </p>
              <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
                Enough to try the site without earning anything first.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-sunken text-muted-foreground">
              <TrendingUp className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                A problem you posted reaches {formatCount(validationsToEarn)}{" "}
                validations
              </p>
              <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
                Proof it was worth posting earns{" "}
                {formatCount(creditsPerValidated)}{" "}
                {creditsPerValidated === 1 ? "credit" : "credits"} back,
                automatically, the moment it crosses the threshold.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-sunken text-muted-foreground">
              <RotateCcw className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                A moderator removes one of your problems
              </p>
              <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
                The credit is refunded, a post that never survived review
                shouldn&apos;t permanently cost you the attempt.
              </p>
            </div>
          </div>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          Credits cap at {formatCount(maxCredits)}, there&apos;s no benefit to
          hoarding them beyond that.
        </p>
      </section>

      <section className="mt-10 border-t border-hairline pt-8">
        <h2 className="text-[1.0625rem] font-bold tracking-[-0.015em] text-foreground">
          Use cases
        </h2>
        <ul className="mt-3 space-y-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
          <li className="flex items-start gap-2.5">
            <Ticket className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
            Only posting a <span className="font-medium text-foreground">new problem</span>{" "}
            spends a credit. Solutions, comments and validations are free,
            always.
          </li>
          <li className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
            The limit is what keeps the feed high-signal, anyone can post,
            but not endlessly, so each post is worth a little more thought.
          </li>
        </ul>
      </section>

      <div className="mt-10 flex flex-wrap gap-2">
        <Button asChild size="lg">
          <Link href="/problems/new">Share a problem</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/reputation">How reputation works</Link>
        </Button>
      </div>
    </div>
  );
}
