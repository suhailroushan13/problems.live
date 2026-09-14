import Link from "next/link";
import { formatCount } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { PlatformStats } from "@/lib/data/stats";

/**
 * The register's vital signs, sitting beside the wordmark. Real counts only —
 * nothing here is invented to look busier than the platform is.
 */
export function LivePill({
  stats,
  className,
}: {
  stats: PlatformStats;
  className?: string;
}) {
  return (
    <Link
      href="/problems"
      className={cn(
        "group tap pill inline-flex items-center gap-2 border border-hairline bg-elevated py-1.5 pr-4 pl-3.5 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:border-brand-border",
        className
      )}
    >
      <span className="relative flex size-2" aria-hidden="true">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60 [animation-duration:2.4s]" />
        <span className="relative inline-flex size-2 rounded-full bg-brand" />
      </span>
      <span className="num font-bold text-brand">
        {formatCount(stats.problems)}
      </span>
      problems
      <span aria-hidden="true">·</span>
      <span className="num font-semibold text-foreground">
        {formatCount(stats.validations)}
      </span>
      validations
      <span
        aria-hidden="true"
        className="transition-transform group-hover:translate-x-0.5"
      >
        →
      </span>
    </Link>
  );
}
