import { cn } from "@/lib/utils";
import {
  PROBLEM_STATUS_LABELS,
  SOLUTION_STATUS_LABELS,
  type ProblemStatus,
  type SolutionStatus,
} from "@/lib/constants";

const DOT: Record<ProblemStatus, string> = {
  open: "bg-muted-foreground",
  needs_collaborators: "bg-brand",
  being_solved: "bg-brand",
  solved: "bg-success",
  not_relevant: "bg-destructive",
};

const BADGE: Record<ProblemStatus, string> = {
  open: "border-hairline bg-tint text-muted-foreground",
  needs_collaborators: "border-transparent bg-brand-muted text-brand",
  being_solved: "border-transparent bg-brand-muted text-brand",
  solved: "border-transparent bg-success-subtle text-success",
  not_relevant: "border-transparent bg-error-subtle text-destructive",
};

/**
 * Every directory card exposes its lifecycle stage. Open stays neutral (the
 * silent default, same philosophy as PriorityBadge's "normal"); the other
 * stages get a color — blue while work is in progress, green once solved,
 * red once marked no longer relevant — so status reads at a glance.
 */
export function StatusDot({
  status,
  className,
}: {
  status: ProblemStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[0.6875rem] font-semibold whitespace-nowrap",
        BADGE[status],
        className
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", DOT[status])} aria-hidden="true" />
      {PROBLEM_STATUS_LABELS[status]}
    </span>
  );
}

export function SolutionStatusDot({
  status,
  className,
}: {
  status: SolutionStatus;
  className?: string;
}) {
  if (status === "proposed") return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[0.8125rem] whitespace-nowrap",
        status === "shipped" ? "text-status-solved" : "text-status-solving",
        className
      )}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          status === "shipped" ? "bg-status-solved" : "bg-status-solving"
        )}
        aria-hidden="true"
      />
      {SOLUTION_STATUS_LABELS[status]}
    </span>
  );
}
