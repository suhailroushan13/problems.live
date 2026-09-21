"use client";

import { useRouter, useSearchParams } from "next/navigation";

/** Shared switch for the two public landing-page representations. */
export function DirectoryViewToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const machineView = searchParams.get("machine") === "1";

  const setView = (view: "human" | "machine") => {
    const next = new URLSearchParams(searchParams.toString());
    if (view === "machine") next.set("machine", "1");
    else next.delete("machine");
    const query = next.toString();
    router.replace(query ? `/?${query}` : "/");
  };

  return (
    <div
      role="tablist"
      aria-label="Problems directory format"
      className="inline-flex items-center rounded-full border border-hairline bg-elevated p-1"
    >
      <DirectoryViewOption label="Human" active={!machineView} onClick={() => setView("human")} />
      <DirectoryViewOption label="Machine" active={machineView} onClick={() => setView("machine")} />
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
