import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Wordmark. The accent lands on ".live".
 */
export function Logo({
  className,
  href = "/",
  compact = false,
}: {
  className?: string;
  href?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center font-bold tracking-[-0.03em] text-foreground",
        compact ? "text-base sm:text-xl" : "text-lg sm:text-xl",
        className
      )}
      aria-label="problems.live, home"
    >
      <span>
        problems<span className="text-brand">.live</span>
      </span>
    </Link>
  );
}
