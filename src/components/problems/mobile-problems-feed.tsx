"use client";

import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ProblemCard } from "./problem-card";
import { cn } from "@/lib/utils";
import type { ProblemFilters } from "@/lib/validation/schemas";
import type { Paginated, ProblemDTO } from "@/types";

const PULL_THRESHOLD = 72;

type FeedPage = Pick<Paginated<ProblemDTO>, "items" | "page" | "hasMore">;

/**
 * Touch-first feed behavior for small screens. Desktop retains visible,
 * link-based pagination; mobile gets progressive loading and a deliberate
 * pull-to-refresh gesture only when the document is already at the top.
 */
export function MobileProblemsFeed({
  initial,
  filters,
  isAuthenticated,
  isModerator,
}: {
  initial: Paginated<ProblemDTO>;
  filters: ProblemFilters;
  isAuthenticated: boolean;
  isModerator: boolean;
}) {
  const [items, setItems] = useState(initial.items);
  const [page, setPage] = useState(initial.page);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadPage = useCallback(async (targetPage: number): Promise<FeedPage> => {
    const params = new URLSearchParams();
    params.set("page", String(targetPage));
    params.set("sort", filters.sort);
    if (filters.category) params.set("category", filters.category);
    if (filters.status) params.set("status", filters.status);
    if (filters.country) params.set("country", filters.country);
    if (filters.scope) params.set("scope", filters.scope);
    if (filters.q) params.set("q", filters.q);

    const response = await fetch(`/api/problems?${params.toString()}`, {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!response.ok) throw new Error("Could not load more problems.");
    return response.json() as Promise<FeedPage>;
  }, [filters]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const next = await loadPage(page + 1);
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...next.items.filter((item) => !seen.has(item.id))];
      });
      setPage(next.page);
      setHasMore(next.hasMore);
    } catch {
      toast.error("Couldn’t load more problems. Try again.");
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, loadPage, page]);

  const refresh = useCallback(async () => {
    if (refreshing || loadingRef.current) return;
    setRefreshing(true);
    try {
      const latest = await loadPage(1);
      setItems(latest.items);
      setPage(latest.page);
      setHasMore(latest.hasMore);
    } catch {
      toast.error("Couldn’t refresh the feed. Try again.");
    } finally {
      setRefreshing(false);
      setPullDistance(0);
    }
  }, [loadPage, refreshing]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) void loadMore(); },
      { rootMargin: "320px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    startY.current = window.scrollY <= 0 ? event.touches[0]?.clientY ?? null : null;
  }

  function onTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (startY.current === null || refreshing) return;
    const distance = Math.max(0, (event.touches[0]?.clientY ?? startY.current) - startY.current);
    setPullDistance(Math.min(PULL_THRESHOLD + 28, distance * 0.45));
  }

  function onTouchEnd() {
    const shouldRefresh = pullDistance >= PULL_THRESHOLD;
    startY.current = null;
    if (shouldRefresh) void refresh();
    else setPullDistance(0);
  }

  const ready = pullDistance >= PULL_THRESHOLD;

  return (
    <div
      className="relative sm:hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div
        aria-live="polite"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-10 flex h-12 -translate-y-full items-center justify-center gap-2 text-xs font-medium text-muted-foreground transition-transform",
          (pullDistance > 0 || refreshing) && "translate-y-0",
        )}
      >
        <RefreshCw className={cn("size-4 transition-transform", refreshing && "animate-spin", ready && "text-brand")} aria-hidden="true" />
        <span>{refreshing ? "Refreshing…" : ready ? "Release to refresh" : "Pull to refresh"}</span>
      </div>

      <div className="space-y-0" style={{ transform: `translateY(${refreshing ? 28 : pullDistance}px)` }}>
        {items.map((problem) => (
          <ProblemCard key={problem.id} problem={problem} isAuthenticated={isAuthenticated} isModerator={isModerator} />
        ))}
      </div>
      <div ref={sentinelRef} className="flex h-16 items-center justify-center" aria-live="polite">
        {loadingMore ? <LoaderCircle className="size-4 animate-spin text-muted-foreground" aria-label="Loading more problems" /> : null}
      </div>
    </div>
  );
}
