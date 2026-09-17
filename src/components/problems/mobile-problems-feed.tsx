"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { ProblemCard } from "./problem-card";
import type { ProblemFilters } from "@/lib/validation/schemas";
import type { Paginated, ProblemDTO } from "@/types";

type FeedPage = Pick<Paginated<ProblemDTO>, "items" | "page" | "hasMore">;

/**
 * Touch-first feed behavior for small screens. Desktop retains visible,
 * link-based pagination; mobile gets progressive loading as the user scrolls.
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
  const pathname = usePathname();
  const [items, setItems] = useState(initial.items);
  const [page, setPage] = useState(initial.page);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [loadingMore, setLoadingMore] = useState(false);
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

  const canLoadMore = isAuthenticated && hasMore;
  const visibleItems = isAuthenticated ? items : items.slice(0, 4);
  const hasMoreForGuest = !isAuthenticated && (items.length > 4 || hasMore);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !canLoadMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) void loadMore(); },
      { rootMargin: "320px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [canLoadMore, loadMore]);

  return (
    <div className="sm:hidden">
      <div className="space-y-3">
        {visibleItems.map((problem) => (
          <ProblemCard key={problem.id} problem={problem} isAuthenticated={isAuthenticated} isModerator={isModerator} />
        ))}
      </div>
      {hasMoreForGuest ? (
        <section className="border-t border-hairline py-7 text-center">
          <p className="text-sm font-semibold text-foreground">Sign in to see more problems</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Join the community to explore the full directory.</p>
          <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25">Sign in</Link>
        </section>
      ) : (
        <div ref={sentinelRef} className="flex h-16 items-center justify-center" aria-live="polite">
          {loadingMore ? <LoaderCircle className="size-4 animate-spin text-muted-foreground" aria-label="Loading more problems" /> : null}
        </div>
      )}
    </div>
  );
}
