"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ProblemMachineView } from "./problem-machine-view";
import type { ProblemDTO } from "@/types";

type View = "human" | "machine";

export function ProblemViewToggle({
  problem,
  permalink,
  children,
}: {
  problem: ProblemDTO;
  permalink: string;
  children: ReactNode;
}) {
  const [view, setView] = useState<View>("human");

  return (
    <>
      {view === "human" ? children : <ProblemMachineView problem={problem} permalink={permalink} />}

      <div className="mt-10 flex justify-center border-t border-hairline pt-8 sm:mt-12 sm:pt-10">
        <div
          role="tablist"
          aria-label="Page view"
          className="inline-flex items-center rounded-full border border-hairline bg-elevated p-1"
        >
          <ViewOption label="Human" active={view === "human"} onClick={() => setView("human")} />
          <ViewOption label="Machine" active={view === "machine"} onClick={() => setView("machine")} />
        </div>
      </div>
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
