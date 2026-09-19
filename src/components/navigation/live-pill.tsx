"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatCount } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type LiveStats = { totalVisits: number; livePeople: number };

const HEARTBEAT_MS = 30_000;

/** A compact, durable view of the people currently exploring the directory. */
export function LivePill({ className }: { className?: string }) {
  const [stats, setStats] = useState<LiveStats | null>(null);

  const refreshStats = useCallback(async () => {
    try {
      const response = await fetch("/api/live-stats", {
        method: "POST",
        cache: "no-store",
      });
      if (!response.ok) return;
      setStats((await response.json()) as LiveStats);
    } catch {
      // The pill stays useful as a simple live signal if the network is down.
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refreshStats(), 0);
    const interval = window.setInterval(refreshStats, HEARTBEAT_MS);
    const refreshOnReturn = () => {
      if (document.visibilityState === "visible") void refreshStats();
    };
    document.addEventListener("visibilitychange", refreshOnReturn);

    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshOnReturn);
    };
  }, [refreshStats]);

  const livePeople = stats?.livePeople ?? 0;
  const label = stats
    ? `${stats.totalVisits.toLocaleString()} total visits. ${livePeople.toLocaleString()} people live now.`
    : "Loading live visitor statistics.";

  return (
    <Link
      href="/problems"
      aria-label={label}
      title={label}
      className={cn(
        "home-landing__stats group inline-flex h-6 min-w-0 items-center gap-1 rounded-full border border-hairline bg-elevated px-2 text-xs leading-none font-normal whitespace-nowrap text-foreground shadow-xs transition-colors hover:border-rule hover:bg-sunken",
        className
      )}
    >
      <span className="home-landing__stats-dot relative flex size-1.5" aria-hidden="true">
        <span className="absolute -inset-px inline-flex animate-ping rounded-full bg-success/40 [animation-duration:2.4s]" />
        <span className="relative inline-flex size-1.5 rounded-full bg-success" />
      </span>
      <span className="num font-[family-name:var(--font-inter)]">{formatCount(livePeople)}</span>
      <span className="home-landing__stats-divider text-muted-foreground" aria-hidden="true">|</span>
      <span className="home-landing__stats-total inline-flex items-center gap-1 num font-[family-name:var(--font-inter)] text-muted-foreground">
        <Users className="size-3" aria-hidden="true" />
        {formatCount(stats?.totalVisits ?? 0)}
      </span>
    </Link>
  );
}
