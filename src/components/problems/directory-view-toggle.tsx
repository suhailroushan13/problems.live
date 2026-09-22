"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** Shared switch for the two public landing-page representations. */
export function DirectoryViewToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const machineView = searchParams.get("machine") === "1";
  const [optimisticMachineView, setOptimisticMachineView] = useState(machineView);
  const [, startTransition] = useTransition();

  useEffect(() => {
    router.prefetch(machineView ? "/" : "/?machine=1");
  }, [machineView, router]);

  const setView = (view: "human" | "machine") => {
    const nextMachineView = view === "machine";
    if (nextMachineView === machineView) return;
    setOptimisticMachineView(nextMachineView);
    const next = new URLSearchParams(searchParams.toString());
    if (view === "machine") next.set("machine", "1");
    else next.delete("machine");
    const query = next.toString();
    startTransition(() => {
      router.replace(query ? `/?${query}` : "/", { scroll: false });
    });
  };

  return (
    <div
      role="tablist"
      aria-label="Problems directory format"
      className="inline-flex items-center rounded-full border border-hairline bg-elevated p-1"
    >
      <DirectoryViewOption label="Human" active={!optimisticMachineView} onClick={() => setView("human")} />
      <DirectoryViewOption label="Machine" active={optimisticMachineView} onClick={() => setView("machine")} />
    </div>
  );
}

function DirectoryViewOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`tap flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition-colors ${
        active ? "bg-sunken text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${active ? "bg-brand" : "bg-muted-foreground/50"}`} />
      {label}
    </button>
  );
}
