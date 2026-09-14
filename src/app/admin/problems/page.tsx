import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProblemAdminActions } from "@/components/admin/problem-admin-actions";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listAdminProblems } from "@/lib/data/admin";
import { PROBLEM_STATUS_LABELS } from "@/lib/constants";
import { formatCount } from "@/lib/utils/format";
import { timeAgo } from "@/lib/utils/time";

export const metadata: Metadata = { title: "Problems" };

export default async function AdminProblemsPage() {
  const [user, problems] = await Promise.all([
    getCurrentUser(),
    listAdminProblems(60),
  ]);

  if (problems.length === 0) {
    return (
      <EmptyState
        title="No problems yet."
        description="Once people start posting, every problem shows up here."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-hairline">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Problem</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Visibility</TableHead>
            <TableHead className="text-right">Validations</TableHead>
            <TableHead className="text-right">Solutions</TableHead>
            <TableHead>Posted</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {problems.map((problem) => (
            <TableRow key={problem.id}>
              <TableCell className="max-w-xs">
                <Link
                  href={`/problems/${problem.slug}`}
                  className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground transition-colors hover:text-brand"
                >
                  {problem.featured ? (
                    <Star className="size-3 shrink-0 fill-brand text-brand" />
                  ) : null}
                  <span className="truncate">{problem.title}</span>
                </Link>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {problem.authorUsername ? `@${problem.authorUsername}` : "Unknown"}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {PROBLEM_STATUS_LABELS[problem.status]}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    problem.moderationStatus === "approved"
                      ? "secondary"
                      : problem.moderationStatus === "pending"
                        ? "default"
                        : "destructive"
                  }
                  className="capitalize"
                >
                  {problem.moderationStatus}
                </Badge>
              </TableCell>
              <TableCell className="num text-right">
                {formatCount(problem.validationCount)}
              </TableCell>
              <TableCell className="num text-right">
                {formatCount(problem.solutionCount)}
              </TableCell>
              <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                {timeAgo(problem.createdAt)}
              </TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <ProblemAdminActions
                    problem={problem}
                    isAdmin={Boolean(user?.isAdmin)}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
