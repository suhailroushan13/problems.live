"use client";

import Link from "next/link";
import { AlertCircle, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/utils/format";
import type { SimilarProblem } from "@/lib/similarity";

/**
 * Advisory, never blocking. We surface what looks close and let the author
 * decide — most "duplicates" turn out to be a materially different problem.
 */
export function DuplicateWarning({
  matches,
  onDismiss,
}: {
  matches: SimilarProblem[];
  onDismiss: () => void;
}) {
  if (matches.length === 0) return null;

  return (
    <div className="rounded-lg border border-brand-border bg-brand-muted/50 p-4">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-brand" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            You may already have a problem like this
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Adding your voice to an existing problem counts for more than a
            second copy of it.
          </p>

          <ul className="mt-3 space-y-1.5">
            {matches.map((match) => (
              <li key={match.id}>
                <Link
                  href={`/problems/${match.slug}`}
                  target="_blank"
                  className="group flex items-start justify-between gap-3 rounded-md border border-hairline bg-elevated px-3 py-2 transition-colors hover:border-brand-border"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {match.title}
                    </span>
                    <span className="num mt-0.5 block text-xs text-muted-foreground">
                      {formatCount(match.validationCount)} people have this problem
                    </span>
                  </span>
                  <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-brand" />
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/problems/${matches[0].slug}`} target="_blank">
                View existing problem
              </Link>
            </Button>
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              My problem is different
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
