import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Wordmark. The accent lands on ".live" and a small signal dot — the register
 * is open and still being written.
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
        "inline-flex shrink-0 items-center gap-2 font-bold tracking-[-0.03em] text-foreground",
        compact ? "text-base sm:text-xl" : "text-lg sm:text-xl",
        className
      )}
      aria-label="problems.live, home"
    >
      <span className="relative flex size-1.5" aria-hidden="true">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-50 [animation-duration:3s]" />
        <span className="relative inline-flex size-1.5 rounded-full bg-success ring-1 ring-success-subtle" />
      </span>
      <span>
        problems<span className="text-brand">.live</span>
      </span>
    </Link>
  );
}
