import type { ReactNode } from "react";
import type { ProblemDTO } from "@/types";

type View = "human" | "machine";

/**
 * Lets the landing-page directory switch between its interactive card layout
 * and a compact, copyable representation of the same visible problems.
 */
export function ProblemDirectoryViewToggle({
  problems,
  children,
  initialView = "human",
}: {
  problems: ProblemDTO[];
  children: ReactNode;
  initialView?: View;
}) {
  const machineData = problems.map((problem) => ({
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
  }));

  return (
    <>
      {initialView === "human" ? children : (
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
