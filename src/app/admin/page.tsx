import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAdminStats } from "@/lib/data/stats";
import { formatCount } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const stats = await getAdminStats();

  const cards = [
    { label: "Total users", value: stats.totalUsers },
    { label: "Total problems", value: stats.totalProblems },
    { label: "Total solutions", value: stats.totalSolutions },
    { label: "Problems solved", value: stats.problemsSolved },
    {
      label: "Reports pending",
      value: stats.reportsPending,
      href: "/admin/reports" as const,
      alert: stats.reportsPending > 0,
    },
    {
      label: "Awaiting moderation",
      value: stats.moderationPending,
      href: "/admin/moderation" as const,
      alert: stats.moderationPending > 0,
    },
    { label: "Comments today", value: stats.commentsToday },
    { label: "New users today", value: stats.newUsersToday },
  ];

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-hairline bg-hairline lg:grid-cols-4">
      {cards.map((card) => {
        const content = (
          <>
            <dd
              className={cn("num text-2xl leading-none font-semibold tracking-[-0.02em]",
                card.alert ? "text-brand" : "text-foreground"
              )}
            >
              {formatCount(card.value)}
            </dd>
            <dt className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              {card.label}
              {card.href ? <ArrowRight className="size-3" /> : null}
            </dt>
          </>
        );

        return card.href ? (
          <Link
            key={card.label}
            href={card.href}
            className="bg-elevated px-4 py-5 transition-colors hover:bg-muted/50"
          >
            {content}
          </Link>
        ) : (
          <div key={card.label} className="bg-elevated px-4 py-5">
            {content}
          </div>
        );
      })}
    </div>
  );
}
