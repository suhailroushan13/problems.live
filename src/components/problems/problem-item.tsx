import Link from "next/link";
import { MousePointerClick } from "lucide-react";
import { CategoryIcon } from "@/components/shared/category-icon";
import { PriorityBadge } from "./priority-badge";
import { StatusDot } from "./status-dot";
import { ValidateButton } from "./validate-button";
import { ProblemLink } from "./problem-link";
import { formatCount } from "@/lib/utils/format";
import { timeAgoLong } from "@/lib/utils/time";
import { cn } from "@/lib/utils";
import type { ProblemDTO } from "@/types";

/**
 * One entry in the register: rank, what the problem is, and how many people
 * share it. A soft tinted panel rather than a bordered card — whitespace and
 * a neutral tint separate rows without drawing a box around every one of them.
 */
export function ProblemItem({
  problem,
  rank,
  isAuthenticated,
  featured = false,
  compact = false,
  className,
}: {
  problem: ProblemDTO;
  rank?: number;
  isAuthenticated: boolean;
  featured?: boolean;
  /** Smaller type throughout — used on the landing page only. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "group relative flex items-start gap-4 rounded-lg px-4 py-5 transition-colors sm:items-center sm:gap-5 sm:px-6",
        featured ? "bg-tint-strong" : "bg-tint hover:bg-tint-strong/70",
        className,
      )}
    >
      {rank !== undefined ? (
        <span
          className={cn(
            "num hidden w-10 shrink-0 text-center font-bold sm:block",
            compact ? "text-base" : "text-xl",
            featured ? "text-brand" : "text-brand/55",
          )}
          aria-hidden="true"
        >
          #{rank}
        </span>
      ) : null}

      <span
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-md sm:size-14",
          featured ? "bg-elevated text-brand" : "bg-elevated/80 text-brand/80",
        )}
        aria-hidden="true"
      >
        <CategoryIcon name={problem.category?.icon} className="size-6" />
      </span>

      <div className="min-w-0 flex-1">
        <h3
          className={cn(
            "flex flex-wrap items-center gap-1.5 leading-snug font-semibold text-foreground",
            compact ? "text-sm sm:text-base" : "text-base sm:text-lg",
          )}
        >
          <PriorityBadge
            priority={problem.priority}
            className="h-4 px-1.5 text-[10px]"
          />
          <ProblemLink
            problemId={problem.id}
            slug={problem.slug}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {problem.title}
          </ProblemLink>
        </h3>

        <p
          className={cn(
            "clamp-1 mt-1.5 text-muted-foreground",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {problem.excerpt}
        </p>

        <div
          className={cn(
            "mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 leading-6 text-muted-foreground",
            "text-xs",
          )}
        >
          {problem.category ? (
            <Link
              href={`/categories/${problem.category.slug}`}
              className="relative z-10 inline-flex items-center gap-1.5 font-semibold text-foreground/75 transition-colors hover:text-brand"
            >
              <CategoryIcon
                name={problem.category.icon}
                className="size-3.5 text-brand/70"
              />
              {problem.category.name}
            </Link>
          ) : null}

          <span aria-hidden="true">·</span>
          <time dateTime={problem.createdAt}>
            {timeAgoLong(problem.createdAt)}
          </time>

          <span aria-hidden="true">·</span>
          {problem.author ? (
            <Link
              href={`/u/${problem.author.username}`}
              className="relative z-10 transition-colors hover:text-brand"
            >
              {problem.author.name.split(" ")[0]}
            </Link>
          ) : (
            <span>Anonymous</span>
          )}

          <span aria-hidden="true">·</span>
          <span className="num">
            {formatCount(problem.solutionCount)}{" "}
            {problem.solutionCount === 1 ? "solution" : "solutions"}
          </span>

          <span aria-hidden="true">·</span>
          <span
            title={`${formatCount(problem.clickCount)} ${
              problem.clickCount === 1 ? "click" : "clicks"
            }`}
            className="num inline-flex items-center gap-1"
          >
            <MousePointerClick className="size-3" />
            {formatCount(problem.clickCount)}
          </span>

          {problem.status !== "open" ? (
            <>
              <span aria-hidden="true">·</span>
              <StatusDot status={problem.status} />
            </>
          ) : null}
        </div>

        {/* On phones the right column has no room, so the count and the action
            move inline beneath the metadata. */}
        <div className="relative z-10 mt-3.5 flex items-center gap-3 sm:hidden">
          <ValidateButton
            problemId={problem.id}
            initialCount={problem.validationCount}
            initialActive={problem.hasValidated}
            isAuthenticated={isAuthenticated}
          />
          <span className={cn("text-muted-foreground", "text-xs")}>
            <span className="num font-bold text-brand">
              {formatCount(problem.validationCount)}
            </span>{" "}
            have this
          </span>
        </div>
      </div>

      <div className="hidden shrink-0 flex-col items-end gap-2.5 sm:flex">
        <span className="text-right">
          <span
            className={cn(
              "num block leading-none font-bold text-brand",
              compact ? "text-base" : "text-xl",
            )}
          >
            {formatCount(problem.validationCount)}
          </span>
          <span className="mt-1 block text-xs whitespace-nowrap text-muted-foreground">
            {problem.validationCount === 1
              ? "person has this"
              : "people have this"}
          </span>
        </span>

        <div className="relative z-10 hidden lg:block">
          <ValidateButton
            problemId={problem.id}
            initialCount={problem.validationCount}
            initialActive={problem.hasValidated}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>
    </article>
  );
}

/** The ranked stack on the landing page. */
export function ProblemList({
  problems,
  isAuthenticated,
  ranked = false,
  compact = false,
  className,
}: {
  problems: ProblemDTO[];
  isAuthenticated: boolean;
  ranked?: boolean;
  /** Smaller type throughout — used on the landing page only. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {problems.map((problem, index) => (
        <ProblemItem
          key={problem.id}
          problem={problem}
          rank={ranked ? index + 1 : undefined}
          isAuthenticated={isAuthenticated}
          featured={ranked && index === 0}
          compact={compact}
        />
      ))}
    </div>
  );
}

/** Sidebar entry: rank, mark, title, count. */
export function ProblemMini({
  problem,
  rank,
  compact = false,
}: {
  problem: ProblemDTO;
  rank?: number;
  /** Smaller type throughout — used on the landing page only. */
  compact?: boolean;
}) {
  return (
    <li>
      <ProblemLink
        problemId={problem.id}
        slug={problem.slug}
        className="tap group flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-tint"
      >
        {rank !== undefined ? (
          <span
            className={cn(
              "num w-7 shrink-0 font-bold text-brand/55",
              compact ? "text-xs" : "text-sm",
            )}
            aria-hidden="true"
          >
            #{rank}
          </span>
        ) : null}

        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-tint text-brand/80"
          aria-hidden="true"
        >
          <CategoryIcon name={problem.category?.icon} className="size-4" />
        </span>

        <span
          className={cn(
            "min-w-0 flex-1 truncate font-semibold text-foreground transition-colors group-hover:text-brand",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {problem.title}
        </span>

        <span
          className={cn(
            "num shrink-0 font-bold text-brand",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {formatCount(problem.validationCount)}
        </span>
      </ProblemLink>
    </li>
  );
}
