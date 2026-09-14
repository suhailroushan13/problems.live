import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ModerationActions } from "@/components/admin/moderation-actions";
import { EmptyState } from "@/components/shared/empty-state";
import { listModerationQueue } from "@/lib/data/admin";
import { timeAgo } from "@/lib/utils/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Moderation queue" };

export default async function ModerationQueuePage() {
  const items = await listModerationQueue();

  if (items.length === 0) {
    return (
      <EmptyState
        title="Queue is clear."
        description="Nothing is waiting for review right now. Held content shows up here automatically."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article
          key={`${item.type}-${item.id}`}
          className="rounded-xl border border-hairline bg-elevated p-4 sm:p-5"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {item.type}
            </Badge>
            <span
              className={cn("num rounded-full border px-2 py-0.5 text-[11px] font-medium",
                item.score >= 0.7
                  ? "border-destructive/25 bg-destructive/10 text-destructive"
                  : "border-hairline text-muted-foreground"
              )}
            >
              score {item.score.toFixed(2)}
            </span>
            {item.labels.map((label) => (
              <Badge key={label} variant="secondary" className="capitalize">
                {label.replace(/_/g, " ")}
              </Badge>
            ))}
            {item.reportCount > 0 ? (
              <Badge variant="destructive">
                {item.reportCount} reports
              </Badge>
            ) : null}
            <span className="ml-auto text-xs text-muted-foreground">
              {timeAgo(item.createdAt)}
            </span>
          </div>

          <h2 className="text-[0.9375rem] font-semibold text-foreground">
            {item.title}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {item.body}
          </p>

          {item.reason ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Flagged for: <span className="text-foreground/80">{item.reason}</span>
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3.5">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {item.authorUsername ? (
                <Link
                  href={`/u/${item.authorUsername}`}
                  className="font-medium text-foreground/75 transition-colors hover:text-brand"
                >
                  @{item.authorUsername}
                </Link>
              ) : (
                <span>Unknown author</span>
              )}
              {item.href ? (
                <Link
                  href={item.href}
                  target="_blank"
                  className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                >
                  View in context
                  <ExternalLink className="size-3" />
                </Link>
              ) : null}
            </div>

            <ModerationActions targetType={item.type} targetId={item.id} />
          </div>
        </article>
      ))}
    </div>
  );
}
