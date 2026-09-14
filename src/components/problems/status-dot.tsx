import { cn } from "@/lib/utils";
import {
  PROBLEM_STATUS_LABELS,
  SOLUTION_STATUS_LABELS,
  type ProblemStatus,
  type SolutionStatus,
} from "@/lib/constants";

const DOT: Record<ProblemStatus, string> = {
  open: "bg-status-open",
  being_solved: "bg-status-solving",
  solved: "bg-status-solved",
  not_relevant: "bg-status-stale",
};

const TEXT: Record<ProblemStatus, string> = {
  open: "text-muted-foreground",
  being_solved: "text-status-solving",
  solved: "text-status-solved",
  not_relevant: "text-muted-foreground",
};

/**
 * Status reads as a quiet indicator, never a badge. The dot plus the word
 * means colour is never the only signal.
 */
export function StatusDot({
  status,
  className,
}: {
  status: ProblemStatus;
  className?: string;
}) {
  if (status === "open") return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[0.8125rem] whitespace-nowrap",
        TEXT[status],
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
