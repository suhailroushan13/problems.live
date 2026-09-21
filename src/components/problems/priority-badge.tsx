import { AlertTriangle, Circle, Flame, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PROBLEM_PRIORITY_LABELS, type ProblemPriority } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STYLES: Record<ProblemPriority, string> = {
  normal: "border-hairline bg-sunken text-muted-foreground",
  important: "bg-warning-subtle text-warning",
  urgent: "bg-error-subtle text-destructive",
};

const ICONS: Record<ProblemPriority, LucideIcon> = {
  normal: Circle,
  important: AlertTriangle,
  urgent: Flame,
};

/**
 * A quiet tag for a problem's author-selected urgency. Callers can opt into
 * showing the normal default where seeing the explicit priority is useful.
 */
export function PriorityBadge({
  priority,
  className,
  showNormal = false,
}: {
  priority: ProblemPriority;
  className?: string;
  showNormal?: boolean;
}) {
  if (priority === "normal" && !showNormal) return null;
  const Icon = ICONS[priority];

  return (
    <Badge
      className={cn(
        "font-semibold",
        priority === "normal" ? "border" : "border-transparent",
        STYLES[priority],
        className,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      <span className="sr-only">Priority: </span>{PROBLEM_PRIORITY_LABELS[priority]}
    </Badge>
  );
}
