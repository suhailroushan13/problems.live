import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Every list surface uses this — a blank screen reads as a bug, not an empty
 * collection. Stated plainly, with the one action that fixes it.
 */
export function EmptyState({
  title,
  description,
  action,
  secondaryAction,
  className,
}: {
  title: string;
  description?: string;
  action?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div className={cn("py-16 text-center sm:py-20", className)}>
      <p className="text-lg font-medium text-foreground">{title}</p>

      {description ? (
        <p className="mx-auto mt-2 max-w-sm text-[0.9375rem] leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}

      {action || secondaryAction ? (
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          {action ? (
            <Button asChild size="lg" className="pill h-12 px-7 font-bold">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button asChild size="lg" variant="ghost" className="pill h-12 px-7 font-bold">
              <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
