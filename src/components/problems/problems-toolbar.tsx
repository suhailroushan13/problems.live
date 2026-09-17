"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Grid2X2, List, Search, SlidersHorizontal } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PROBLEM_STATUSES, PROBLEM_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { CategoryDTO } from "@/types";

const ALL = "__all__";
const SORTS = [
  { value: "trending", label: "Trending" },
  { value: "validated", label: "Most upvoted" },
  { value: "discussed", label: "Most discussed" },
  { value: "newest", label: "Newest" },
  { value: "updated", label: "Recently updated" },
  { value: "unsolved", label: "Unsolved" },
] as const;

/** Mobile keeps discovery to search + two controls; detailed filters live in a sheet. */
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
  const sort = searchParams.get("sort") ?? "trending";
  const view = searchParams.get("view") === "card" ? "card" : "list";
  const [query, setQuery] = useState(urlQuery);
  const [syncedQuery, setSyncedQuery] = useState(urlQuery);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftCategory, setDraftCategory] = useState(category);
  const [draftStatus, setDraftStatus] = useState(status);

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

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === urlQuery) return;
    const timer = setTimeout(
      () => pushParams({ q: trimmed || undefined }),
      300,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const activeFilterCount = Number(category !== ALL) + Number(status !== ALL);
  const openFilters = () => {
    setDraftCategory(category);
    setDraftStatus(status);
    setFilterOpen(true);
  };
  const applyFilters = () => {
    pushParams({ category: draftCategory, status: draftStatus });
    setFilterOpen(false);
  };
  const resetFilters = () => {
    setDraftCategory(ALL);
    setDraftStatus(ALL);
    pushParams({ category: undefined, status: undefined });
    setFilterOpen(false);
  };

  return (
    <div className={className}>
      <div className="sm:hidden">
        <InputGroup className="h-12 rounded-xl border-hairline bg-elevated shadow-none">
          <InputGroupAddon className="pl-3">
            <Search
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search problems"
            aria-label="Search problems"
            className="text-sm"
          />
        </InputGroup>

        <div className="hidden">
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                onClick={openFilters}
                className="h-11 justify-between rounded-md border-hairline bg-elevated px-3.5 text-sm"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <SlidersHorizontal className="size-4" aria-hidden="true" />
                  Filter
                </span>
                {activeFilterCount > 0 ? (
                  <span className="rounded-full bg-brand px-1.5 py-0.5 text-[0.6875rem] font-bold text-brand-foreground">
                    {activeFilterCount}
                  </span>
                ) : null}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="max-h-[85vh] rounded-t-xl p-0"
            >
              <SheetHeader className="border-b border-hairline px-5 pt-5 pb-4">
                <SheetTitle className="text-lg font-bold">
                  Filter problems
                </SheetTitle>
              </SheetHeader>
              <div className="overflow-y-auto px-5 py-5">
                <FilterSection title="Category">
                  <FilterOption
                    active={draftCategory === ALL}
                    onClick={() => setDraftCategory(ALL)}
                  >
                    All
                  </FilterOption>
                  {categories.map((item) => (
                    <FilterOption
                      key={item.id}
                      active={draftCategory === item.slug}
                      onClick={() => setDraftCategory(item.slug)}
                    >
                      {item.name}
                    </FilterOption>
                  ))}
                </FilterSection>
                <FilterSection title="Status" className="mt-7">
                  <FilterOption
                    active={draftStatus === ALL}
                    onClick={() => setDraftStatus(ALL)}
                  >
                    All
                  </FilterOption>
                  {PROBLEM_STATUSES.map((value) => (
                    <FilterOption
                      key={value}
                      active={draftStatus === value}
                      onClick={() => setDraftStatus(value)}
                    >
                      {PROBLEM_STATUS_LABELS[value]}
                    </FilterOption>
                  ))}
                </FilterSection>
              </div>
              <SheetFooter className="grid grid-cols-2 gap-3 border-t border-hairline bg-elevated px-5 py-4 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="h-11 rounded-md"
                >
                  Reset
                </Button>
                <Button onClick={applyFilters} className="h-11 rounded-md">
                  Apply filters
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <Select
            value={sort}
            onValueChange={(value) => pushParams({ sort: value })}
          >
            <SelectTrigger
              aria-label="Sort problems"
              className="h-11! rounded-md border-hairline bg-elevated px-3.5 text-sm font-semibold shadow-none"
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
          <ViewToggle
            value={view}
            onChange={(value) => pushParams({ view: value === "list" ? undefined : value })}
            compact
          />
        </div>
      </div>

      <div className="hidden sm:flex sm:flex-col sm:gap-3 lg:flex-row lg:items-center">
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
        </InputGroup>
        <div className="grid grid-cols-2 gap-2 lg:flex lg:shrink-0">
          <ToolbarSelect
            ariaLabel="Filter by category"
            value={category}
            onChange={(value) => pushParams({ category: value })}
            className="lg:w-44"
          >
            <SelectItem value={ALL}>All categories</SelectItem>
            {categories.map((item) => (
              <SelectItem key={item.id} value={item.slug}>
                {item.name}
              </SelectItem>
            ))}
          </ToolbarSelect>
          <ToolbarSelect
            ariaLabel="Filter by status"
            value={status}
            onChange={(value) => pushParams({ status: value })}
            className="lg:w-36"
          >
            <SelectItem value={ALL}>All statuses</SelectItem>
            {PROBLEM_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {PROBLEM_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </ToolbarSelect>
          <ToolbarSelect
            ariaLabel="Sort problems"
            value={sort}
            onChange={(value) => pushParams({ sort: value })}
            className="lg:w-44"
          >
            {SORTS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </ToolbarSelect>
          <ViewToggle
            value={view}
            onChange={(value) => pushParams({ view: value === "list" ? undefined : value })}
          />
        </div>
      </div>
    </div>
  );
}

function ViewToggle({
  value,
  onChange,
  compact = false,
}: {
  value: "list" | "card";
  onChange: (value: "list" | "card") => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex h-11 items-center rounded-md border border-hairline bg-elevated p-1",
        !compact && "lg:w-[5.75rem]",
      )}
      aria-label="Problem view"
    >
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-label="List view"
        aria-pressed={value === "list"}
        title="List view"
        className={cn(
          "tap flex h-full min-w-0 flex-1 items-center justify-center rounded-sm transition-colors",
          value === "list"
            ? "bg-brand-muted text-brand"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <List className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onChange("card")}
        aria-label="Card view"
        aria-pressed={value === "card"}
        title="Card view"
        className={cn(
          "tap flex h-full min-w-0 flex-1 items-center justify-center rounded-sm transition-colors",
          value === "card"
            ? "bg-brand-muted text-brand"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Grid2X2 className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function ToolbarSelect({
  ariaLabel,
  value,
  onChange,
  className,
  children,
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(
          "h-11! w-full border-hairline bg-elevated text-sm shadow-none",
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

function FilterSection({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={className}>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">{children}</div>
    </section>
  );
}

function FilterOption({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "tap h-10 rounded-md border px-3 text-left text-sm font-medium transition-colors",
        active
          ? "border-brand bg-brand-muted text-brand"
          : "border-hairline bg-elevated text-foreground hover:bg-sunken",
      )}
    >
      {children}
    </button>
  );
}
