import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportActions } from "@/components/admin/report-actions";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listReports } from "@/lib/data/admin";
import { REPORT_REASON_LABELS } from "@/lib/constants";
import { timeAgo } from "@/lib/utils/time";

export const metadata: Metadata = { title: "Reports" };

const FILTERS = ["pending", "actioned", "dismissed", "all"] as const;
type Filter = (typeof FILTERS)[number];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const filter: Filter = FILTERS.includes(query.status as Filter)
    ? (query.status as Filter)
    : "pending";

  const [user, reports] = await Promise.all([
    getCurrentUser(),
    listReports(filter === "all" ? "all" : filter),
  ]);

  return (
    <>
      <Tabs value={filter} className="mb-6">
        <TabsList className="no-scrollbar max-w-full overflow-x-auto">
          {FILTERS.map((value) => (
            <TabsTrigger key={value} value={value} asChild>
              <Link
                href={
                  value === "pending"
                    ? "/admin/reports"
                    : `/admin/reports?status=${value}`
                }
                scroll={false}
                className="capitalize"
              >
                {value}
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {reports.length === 0 ? (
        <EmptyState
          title={
            filter === "pending"
              ? "No reports waiting."
              : `No ${filter} reports.`
          }
          description="Reports filed by the community show up here for review."
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <article
              key={report.id}
              className="rounded-xl border border-hairline bg-elevated p-4 sm:p-5"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="destructive">
                  {REPORT_REASON_LABELS[report.reason]}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {report.targetType}
                </Badge>
                <Badge variant="secondary" className="capitalize">
                  {report.status}
                </Badge>
                {report.target && report.target.reportCount > 1 ? (
                  <Badge variant="destructive">
                    {report.target.reportCount} total reports
                  </Badge>
                ) : null}
                <span className="ml-auto text-xs text-muted-foreground">
                  {timeAgo(report.createdAt)}
                </span>
              </div>

              {report.target ? (
                <>
                  <h2 className="text-[0.9375rem] font-semibold text-foreground">
                    {report.target.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {report.target.body}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  The reported content no longer exists.
                </p>
              )}

              {report.details ? (
                <p className="mt-3 rounded-md border border-hairline bg-sunken px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/80">
                    Reporter note:
                  </span>{" "}
                  {report.details}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3.5">
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    Reported by{" "}
                    {report.reporter ? (
                      <Link
                        href={`/u/${report.reporter.username}`}
                        className="font-medium text-foreground/75 transition-colors hover:text-brand"
                      >
                        @{report.reporter.username}
                      </Link>
                    ) : ("a deleted account"
                    )}
                  </span>

                  {report.target?.authorUsername ? (
                    <span>
                      Author{" "}
                      <Link
                        href={`/u/${report.target.authorUsername}`}
                        className="font-medium text-foreground/75 transition-colors hover:text-brand"
                      >
                        @{report.target.authorUsername}
                      </Link>
                    </span>
                  ) : null}

                  {report.target?.href ? (
                    <Link
                      href={report.target.href}
                      target="_blank"
                      className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                    >
                      View in context
                      <ExternalLink className="size-3" />
                    </Link>
                  ) : null}
                </div>

                {report.status === "pending" ? (
                  <ReportActions
                    reportId={report.id}
                    targetType={report.targetType}
                    targetId={report.targetId}
                    authorId={report.target?.authorId ?? null}
                    authorUsername={report.target?.authorUsername ?? null}
                    canSuspend={Boolean(user?.isAdmin)}
                  />
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
