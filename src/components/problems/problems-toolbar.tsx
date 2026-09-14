"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROBLEM_STATUSES, PROBLEM_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { CategoryDTO } from "@/types";

const ALL = "__all__";

/**
 * The directory's sort options, in the order the dropdown shows them. Kept
 * local rather than reusing the sitewide PROBLEM_SORT_LABELS map because this
 * toolbar deliberately excludes "Trending" and "Most discussed" — validation
 * count is the one upvote-equivalent signal the data model has, so it is the
 * default and the only "most X" option beyond solutions.
 */
const SORTS = [
  { value: "validated", label: "Most validated" },
  { value: "solutions", label: "Most solutions" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
] as const;

export function ProblemsToolbar({
  categories,
  className,
}: {
  categories: CategoryDTO[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlQuery = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? ALL;
  const status = searchParams.get("status") ?? ALL;
  const sort = searchParams.get("sort") ?? "validated";

  const [query, setQuery] = useState(urlQuery);
  // Re-sync the editable draft when the URL changes from outside this input
  // (back/forward, a filter reset link) — done during render, per React's
  // guidance for adjusting state from a changing prop, so it never fires an
  // extra commit the way a `useEffect(() => setQuery(urlQuery), [urlQuery])`
  // would.
  const [syncedQuery, setSyncedQuery] = useState(urlQuery);
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery);
    setQuery(urlQuery);
  }

  function pushParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === ALL) params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    const next = params.toString();
    router.push(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  // Debounced so typing never fires a request per keystroke.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === urlQuery) return;
    const timer = setTimeout(() => {
      pushParams({ q: trimmed || undefined });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the draft changes; pushParams/urlQuery read fresh values from the latest render
  }, [query]);

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center", className)}>
      <InputGroup className="h-11 flex-1 border-hairline bg-elevated shadow-none">
        <InputGroupAddon>
          <Search className="text-muted-foreground" aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search problems…"
          aria-label="Search problems"
          className="text-sm"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupText className="hidden rounded-md border border-hairline px-1.5 py-0.5 font-mono text-[0.6875rem] sm:inline-flex">
            ⌘K
          </InputGroupText>
        </InputGroupAddon>
      </InputGroup>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center">
        <Select
          value={category}
          onValueChange={(value) => pushParams({ category: value })}
        >
          <SelectTrigger
            aria-label="Filter by category"
            className="h-11! w-full border-hairline bg-elevated text-sm shadow-none sm:w-44"
          >
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={ALL}>All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.slug}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status}
          onValueChange={(value) => pushParams({ status: value })}
        >
          <SelectTrigger
            aria-label="Filter by status"
            className="h-11! w-full border-hairline bg-elevated text-sm shadow-none sm:w-36"
          >
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {PROBLEM_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {PROBLEM_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(value) => pushParams({ sort: value })}>
          <SelectTrigger
            aria-label="Sort problems"
            className="col-span-2 h-11! w-full border-hairline bg-elevated text-sm shadow-none sm:col-span-1 sm:w-44"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
