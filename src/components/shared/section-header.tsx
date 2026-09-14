import Link from "next/link";
import { cn } from "@/lib/utils";

export function SectionHeader({
  title,
  description,
  href,
  hrefLabel = "See all",
  className,
}: {
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-6", className)}>
      <div className="min-w-0">
        <h2 className="text-xl font-bold tracking-[-0.02em] text-foreground sm:text-[1.375rem]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1.5 text-[0.9375rem] text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      {href ? (
        <Link
          href={href}
          className="shrink-0 text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground"
        >
          {hrefLabel}
        </Link>
      ) : null}
    </div>
  );
}
