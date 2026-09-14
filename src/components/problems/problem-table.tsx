import Link from "next/link";
import { ArrowRight, CheckCircle2, MessageSquare } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CategoryIcon } from "@/components/shared/category-icon";
import { StatusDot } from "./status-dot";
import { formatCount } from "@/lib/utils/format";
import { timeAgo } from "@/lib/utils/time";
import type { ProblemDTO } from "@/types";

/**
 * Register view: one row per problem, dense enough to scan a whole page at
 * once. Category, solutions and date drop off on narrow screens rather than
 * forcing horizontal scroll — validations stay because it's the number
 * people are actually here to compare.
 */
export function ProblemTable({
  problems,
  startRank = 1,
}: {
  problems: ProblemDTO[];
  startRank?: number;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-hairline">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Problem</TableHead>
            <TableHead className="hidden md:table-cell">Category</TableHead>
            <TableHead className="text-right">Validations</TableHead>
            <TableHead className="hidden text-right sm:table-cell">
              Solutions
            </TableHead>
            <TableHead className="hidden text-right lg:table-cell">
              Created
            </TableHead>
            <TableHead className="w-10">
              <span className="sr-only">View</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {problems.map((problem, index) => (
            <TableRow key={problem.id}>
              <TableCell className="num text-sm text-muted-foreground/60">
                {startRank + index}
              </TableCell>

              <TableCell className="max-w-0 whitespace-normal">
                <Link
                  href={`/problems/${problem.slug}`}
                  className="clamp-1 block text-sm font-semibold text-foreground transition-colors hover:text-brand"
                >
                  {problem.title}
                </Link>
                <p className="clamp-1 mt-0.5 text-xs text-muted-foreground">
                  {problem.excerpt}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground md:hidden">
                  {problem.category ? (
                    <span className="inline-flex items-center gap-1">
                      <CategoryIcon
                        name={problem.category.icon}
                        className="size-3 text-brand/70"
                      />
                      {problem.category.name}
                    </span>
                  ) : null}
                  {problem.status !== "open" ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <StatusDot status={problem.status} />
                    </>
                  ) : null}
                </div>
              </TableCell>

              <TableCell className="hidden md:table-cell">
                {problem.category ? (
                  <Link
                    href={`/categories/${problem.category.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-tint px-2.5 py-1 text-xs font-medium text-foreground/75 transition-colors hover:text-brand"
                  >
                    <CategoryIcon
                      name={problem.category.icon}
                      className="size-3.5 text-brand/70"
                    />
                    {problem.category.name}
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>

              <TableCell className="num text-right text-sm font-semibold text-foreground">
                <span className="inline-flex items-center justify-end gap-1.5">
                  <CheckCircle2 className="size-3.5 shrink-0 text-brand/70" />
                  {formatCount(problem.validationCount)}
                </span>
              </TableCell>

              <TableCell className="num hidden text-right text-sm text-muted-foreground sm:table-cell">
                <span className="inline-flex items-center justify-end gap-1.5">
                  <MessageSquare className="size-3.5 shrink-0 text-muted-foreground/60" />
                  {formatCount(problem.solutionCount)}
                </span>
              </TableCell>

              <TableCell className="hidden text-right text-xs whitespace-nowrap text-muted-foreground lg:table-cell">
                {timeAgo(problem.createdAt)}
              </TableCell>

              <TableCell>
                <Link
                  href={`/problems/${problem.slug}`}
                  aria-label={`View “${problem.title}”`}
                  className="tap flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-tint hover:text-brand"
                >
                  <ArrowRight className="size-4" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
