import Link from "next/link";
import { Flame, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RankingOption {
  key: string;
  label: string;
  href: string;
}

/**
 * A centred capsule with one solid pill for the active ranking. Two choices
 * only — more than that and it stops being a glance.
 */
export function RankingToggle({
  options,
  activeKey,
  className,
}: {
  options: RankingOption[];
  activeKey: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pill inline-flex items-center gap-1 border border-brand-border bg-elevated p-1.5",
        className
      )}
      role="group"
      aria-label="Ranking"
    >
      {options.map((option) => {
        const active = option.key === activeKey;
        const Icon = option.key === "all" ? Trophy : Flame;

        return (
          <Link
            key={option.key}
            href={option.href}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "tap pill inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold transition-colors",
              active
                ? "bg-brand text-brand-foreground"
                : "text-foreground/70 hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
