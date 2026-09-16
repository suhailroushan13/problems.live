import { AlertTriangle, Flame, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PROBLEM_PRIORITY_LABELS, type ProblemPriority } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STYLES: Record<Exclude<ProblemPriority, "normal">, string> = {
  important: "bg-warning-subtle text-warning",
  urgent: "bg-error-subtle text-destructive",
};

const ICONS: Record<Exclude<ProblemPriority, "normal">, LucideIcon> = {
  important: AlertTriangle,
  urgent: Flame,
};

/**
 * A quiet tag for problems that need attention sooner. "Normal" is the
 * silent default and renders nothing, same as StatusDot hides "open".
 */
export function PriorityBadge({
  priority,
  className,
}: {
  priority: ProblemPriority;
  className?: string;
}) {
  if (priority === "normal") return null;
  const Icon = ICONS[priority];

  return (
    <Badge className={cn("border-transparent font-semibold", STYLES[priority], className)}>
      <Icon className="size-3" aria-hidden="true" />
      {PROBLEM_PRIORITY_LABELS[priority]}
    </Badge>
  );
}
