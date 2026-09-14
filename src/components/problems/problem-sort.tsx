"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PROBLEM_SORTS,
  PROBLEM_STATUSES,
  type ProblemSort,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Sorting and filtering in plain words. All state lives in the URL, so every
 * view is shareable and server-rendered.
 */
const SORT_LABELS: Record<ProblemSort, string> = {
  validated: "Most people have it",
  trending: "Trending now",
  newest: "Newest",
  discussed: "Most discussed",
  solutions: "Most solutions",
};

const STATUS_LABELS: Record<string, string> = {
  __all__: "Any status",
  open: "Still open",
  being_solved: "Being solved",
  solved: "Solved",
  not_relevant: "No longer relevant",
};

const ALL = "__all__";

export function ProblemSort({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sort = (searchParams.get("sort") ?? "trending") as ProblemSort;
  const status = searchParams.get("status") ?? ALL;

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === ALL) params.delete(key);
      else params.set(key, value);
      params.delete("page");
      const next = params.toString();
      router.push(next ? `${pathname}?${next}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Select value={sort} onValueChange={(value) => setParam("sort", value)}>
        <SelectTrigger
          aria-label="Sort problems"
          className="pill h-11! w-auto min-w-48 border-hairline bg-elevated px-5 text-sm font-semibold shadow-none"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PROBLEM_SORTS.map((value) => (
            <SelectItem key={value} value={value}>
              {SORT_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={(value) => setParam("status", value)}>
        <SelectTrigger
          aria-label="Filter by status"
          className="pill h-11! w-auto min-w-36 border-hairline bg-elevated px-5 text-sm font-semibold shadow-none"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{STATUS_LABELS[ALL]}</SelectItem>
          {PROBLEM_STATUSES.map((value) => (
            <SelectItem key={value} value={value}>
              {STATUS_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
