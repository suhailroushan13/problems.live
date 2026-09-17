import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  MessageCircle,
  ShieldAlert,
  Sparkles,
  ThumbsUp,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getSetting } from "@/lib/config/settings";
import { REPUTATION, TRUST_TIERS } from "@/lib/constants";
import { formatCount } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Score",
  description:
    "How Score (reputation) works on problems.live, how to earn it, what trust tiers unlock, and where it shows up.",
  alternates: { canonical: "/score" },
};

const EARN_ACTIONS = [
  {
    icon: ThumbsUp,
    title: "Someone validates your problem",
    body: "Every “I have this too” on a problem you posted is a stranger saying your post was worth writing.",
    points: REPUTATION.PROBLEM_VALIDATED,
  },
  {
    icon: Sparkles,
    title: "Your solution is marked helpful",
    body: "Helpful marks are how the community filters real answers up from noise.",
    points: REPUTATION.SOLUTION_HELPFUL,
  },
  {
    icon: MessageCircle,
    title: "Your comment is marked helpful",
    body: "Smaller signal, same idea, good context in a thread still counts.",
    points: REPUTATION.COMMENT_HELPFUL,
  },
  {
    icon: CheckCircle2,
    title: "Your problem gets marked solved",
    body: "You closed the loop on something real. This is the single biggest Score event on the site.",
    points: REPUTATION.PROBLEM_SOLVED,
  },
  {
    icon: Trophy,
    title: "Your solution is accepted",
    body: "The author of the problem picked your answer as the one that actually worked.",
    points: REPUTATION.SOLUTION_ACCEPTED,
  },
  {
    icon: ShieldAlert,
    title: "Content you posted is removed",
    body: "Moderators removing a post for breaking the guidelines costs Score. It never drops your total below zero.",
    points: REPUTATION.CONTENT_REMOVED,
  },
];

export default async function ReputationPage() {
  const [user, reputationToSuggestCategory] = await Promise.all([
    getCurrentUser(),
    getSetting("reputationToSuggestCategory"),
  ]);

  const tierIndex = user
    ? TRUST_TIERS.findIndex((t) => t.key === user.trust)
    : -1;
  const currentTier = tierIndex >= 0 ? TRUST_TIERS[tierIndex] : null;
  const nextTier =
    tierIndex >= 0 && tierIndex < TRUST_TIERS.length - 1
      ? TRUST_TIERS[tierIndex + 1]
      : null;
  const progressPct =
    user && currentTier && nextTier
      ? Math.min(
          100,
          Math.max(
            0,
            ((user.reputation - currentTier.minReputation) /
              (nextTier.minReputation - currentTier.minReputation)) *
              100
          )
        )
      : 100;

  return (
    <div className="page py-12 sm:py-16">
      <header className="mb-10">
        <p className="label text-brand">Score</p>
        <h1 className="mt-2 text-[2rem] font-bold tracking-[-0.035em] text-foreground sm:text-[2.75rem]">
          Your reputation, made clear
        </h1>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted-foreground">
          Score is your reputation. It only moves when other people respond to what you posted,
          never for your own actions on your own content. It&apos;s the quiet signal
          that tells everyone else whether to take what you say seriously.
        </p>
      </header>

      {user ? (
        <section className="mb-10 rounded-xl border border-brand-border bg-linear-to-b from-brand-muted to-background p-5 sm:p-6">
          <p className="label text-brand">Your Score</p>
          <p className="mt-2 text-[1.75rem] leading-tight font-bold tracking-[-0.025em] text-foreground">
            <span className="num">{formatCount(user.reputation)}</span>{" "}
            <span className="font-semibold text-foreground/75">
              · {currentTier?.label ?? "New"}
            </span>
          </p>

          {nextTier ? (
            <div className="mt-4">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-sunken">
                <div
                  className="h-full rounded-full bg-brand transition-[width]"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {formatCount(nextTier.minReputation - user.reputation)} more to{" "}
                <span className="font-medium text-foreground">
                  {nextTier.label}
                </span>
              </p>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              You&apos;ve reached the highest tier.
            </p>
          )}
        </section>
      ) : null}

      <section>
        <h2 className="text-[1.0625rem] font-bold tracking-[-0.015em] text-foreground">
          How it works
        </h2>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
          Every problem, solution and comment starts at zero influence. When
          someone else validates your problem, marks your solution or comment
          helpful, or your problem gets solved, your Score goes up. When
          something you posted gets removed for breaking the guidelines, it
          goes down, but it never drops below zero, so one bad post doesn&apos;t
          follow you forever.
        </p>
      </section>

      <section className="mt-10 border-t border-hairline pt-8">
        <h2 className="text-[1.0625rem] font-bold tracking-[-0.015em] text-foreground">
          How to earn it
        </h2>
        <div className="mt-4 space-y-4">
          {EARN_ACTIONS.map((action) => (
            <div key={action.title} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-sunken text-muted-foreground">
                <action.icon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">
                    {action.title}
                  </p>
                  <span
                    className={cn(
                      "num shrink-0 text-sm font-bold",
                      action.points > 0 ? "text-status-solved" : "text-destructive"
                    )}
                  >
                    {action.points > 0 ? "+" : ""}
                    {action.points}
                  </span>
                </div>
                <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
                  {action.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 border-t border-hairline pt-8">
        <h2 className="text-[1.0625rem] font-bold tracking-[-0.015em] text-foreground">
          Trust tiers
        </h2>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
          Tiers unlock capability rather than gate basic participation, you
          can post, vote and comment from the moment you sign in.
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-hairline">
          {TRUST_TIERS.map((tier, index) => (
            <div
              key={tier.key}
              className={cn(
                "flex items-center justify-between gap-3 px-4 py-3",
                index > 0 && "border-t border-hairline",
                user?.trust === tier.key && "bg-brand-muted/40"
              )}
            >
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {tier.label}
                  {user?.trust === tier.key ? (
                    <span className="ml-2 text-xs font-normal text-brand">
                      You are here
                    </span>
                  ) : null}
                </p>
                {tier.key === "regular" ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Unlocks suggesting new categories.
                  </p>
                ) : null}
              </div>
              <span className="num text-sm text-muted-foreground">
                {formatCount(tier.minReputation)}+
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 border-t border-hairline pt-8">
        <h2 className="text-[1.0625rem] font-bold tracking-[-0.015em] text-foreground">
          Where it&apos;s used
        </h2>
        <ul className="mt-3 space-y-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
          <li>
            It&apos;s shown on your{" "}
            <Link href={user ? `/u/${user.username}` : "/problems"} className="text-brand hover:underline">
              public profile
            </Link>{" "}
            and on the{" "}
            <Link href="/leaderboard" className="text-brand hover:underline">
              leaderboard
            </Link>
            , so anyone can see how much of the community stands behind you.
          </li>
          <li>
            At Score {formatCount(reputationToSuggestCategory)} you can
            suggest new categories for the site.
          </li>
          <li>
            It&apos;s a read on track record, not a currency, you can&apos;t spend it,
            gift it, or buy it.
          </li>
        </ul>
      </section>

      <div className="mt-10 flex flex-wrap gap-2">
        <Button asChild size="lg">
          <Link href="/problems/new">Share a problem</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/leaderboard">See the leaderboard</Link>
        </Button>
      </div>
    </div>
  );
}
