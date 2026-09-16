import Link from "next/link";
import { CategoryIcon } from "@/components/shared/category-icon";
import { ValidateButton } from "./validate-button";
import { formatCount } from "@/lib/utils/format";
import type { ProblemDTO } from "@/types";

/**
 * Leaderboard-style row used for "Most validated" — a different rhythm from
 * the card grid so the homepage does not read as five identical sections.
 */
export function RankedProblemRow({
  problem,
  rank,
  isAuthenticated,
}: {
  problem: ProblemDTO;
  rank: number;
  isAuthenticated: boolean;
}) {
  return (
    <li className="group relative flex items-center gap-4 py-3.5">
      <span className="num w-6 shrink-0 text-sm font-medium text-muted-foreground/60">
        {String(rank).padStart(2, "0")}
      </span>

      <div className="min-w-0 flex-1">
        <Link
          href={`/problems/${problem.slug}`}
          className="block truncate text-sm font-medium text-foreground transition-colors group-hover:text-brand"
        >
          {problem.title}
        </Link>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          {problem.category ? (
            <span className="inline-flex items-center gap-1">
              <CategoryIcon name={problem.category.icon} className="size-3" />
              {problem.category.name}
            </span>
          ) : null}
          <span className="text-muted-foreground/50">·</span>
          <span className="num">
            {formatCount(problem.solutionCount)}{" "}
            {problem.solutionCount === 1 ? "solution" : "solutions"}
          </span>
        </p>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <div className="num text-base font-semibold text-foreground">
          {formatCount(problem.validationCount)}
        </div>
        <div className="text-xs text-muted-foreground">have this</div>
      </div>

      <div className="shrink-0">
        <ValidateButton
          problemId={problem.id}
          initialCount={problem.validationCount}
          initialActive={problem.hasValidated}
          isAuthenticated={isAuthenticated}
        />
      </div>
    </li>
  );
}
