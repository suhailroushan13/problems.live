"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ProblemDTO } from "@/types";

type View = "human" | "machine";

/**
 * Lets the landing-page directory switch between its interactive card layout
 * and a compact, copyable representation of the same visible problems.
 */
export function ProblemDirectoryViewToggle({
  problems,
  children,
}: {
  problems: ProblemDTO[];
  children: ReactNode;
}) {
  const [view, setView] = useState<View>("human");
  const machineData = useMemo(
    () =>
      problems.map((problem) => ({
        title: problem.title,
        permalink: `/problems/${problem.slug}`,
        description: problem.description,
        category: problem.category?.name ?? null,
        status: problem.status,
        priority: problem.priority,
        location: problem.location.label,
        author: problem.isAnonymous ? "anonymous" : problem.author?.username ?? null,
        createdAt: problem.createdAt,
        stats: {
          validations: problem.validationCount,
          comments: problem.commentCount,
          solutions: problem.solutionCount,
          views: problem.clickCount,
        },
      })),
    [problems],
  );

  return (
    <>
      <div className="mb-3 flex justify-end sm:mb-4">
        <div
          role="tablist"
          aria-label="Directory view"
          className="inline-flex items-center rounded-full border border-hairline bg-elevated p-1"
        >
          <ViewOption label="Human" active={view === "human"} onClick={() => setView("human")} />
          <ViewOption label="Machine" active={view === "machine"} onClick={() => setView("machine")} />
        </div>
      </div>

      {view === "human" ? children : (
        <pre
          aria-label="Machine-readable problem directory"
          className="overflow-x-auto rounded-lg border border-hairline bg-sunken p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground/85 sm:p-6 sm:text-[0.8125rem]"
        >
          {JSON.stringify({ problems: machineData }, null, 2)}
        </pre>
      )}
    </>
  );
}

function ViewOption({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "tap flex h-8 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition-colors",
        active ? "bg-sunken text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full transition-colors",
          active ? "bg-brand" : "bg-muted-foreground/50",
        )}
      />
      {label}
    </button>
  );
}
