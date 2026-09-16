"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Compass, LayoutGrid } from "lucide-react";
import { CategoryIcon } from "@/components/shared/category-icon";
import { cn } from "@/lib/utils";
import type { CategoryDTO } from "@/types";

/**
 * The category rail: one soft capsule holding every filter, scrolling
 * horizontally when it runs out of room. The selected pill is the only solid
 * shape in the row.
 */
export function CategoryBar({
  categories,
  activeSlug,
  /** A compact, scrollable mobile rail keeps discovery one-handed. */
  limit = 8,
  className,
  /** Signed-in app view — matches the wider container the rest of the page uses. */
  wide = false,
}: {
  categories: CategoryDTO[];
  activeSlug?: string;
  limit?: number;
  className?: string;
  wide?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = activeSlug ?? searchParams.get("category") ?? undefined;

  function hrefFor(slug?: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) params.set("category", slug);
    else params.delete("category");
    params.delete("page");
    const base = pathname === "/" ? "/" : "/problems";
    const query = params.toString();
    return query ? `${base}?${query}` : base;
  }

  // The selected category is always shown, even when it falls outside the
  // shortlist, so the bar never loses its own state.
  const shortlist = categories.slice(0, limit);
  if (active && !shortlist.some((c) => c.slug === active)) {
    const selected = categories.find((c) => c.slug === active);
    if (selected) shortlist.push(selected);
  }

  return (
    <div className={cn(wide ? "page-wide" : "page", className)}>
      <div className="relative -mr-4 flex items-center gap-2 overflow-x-auto pr-4 no-scrollbar sm:mr-0 sm:gap-1 sm:rounded-full sm:bg-sunken sm:px-2 sm:py-2">
        <Link
          href={hrefFor(undefined)}
          scroll={false}
          aria-current={!active ? "page" : undefined}
          className={cn(
            "tap inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[0.625rem] border px-3.5 text-sm font-semibold whitespace-nowrap transition-colors sm:h-auto sm:rounded-full sm:border-0 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm sm:font-bold",
            !active
              ? "border-brand bg-brand text-brand-foreground"
              : "border-hairline bg-elevated text-foreground/75 hover:bg-sunken hover:text-foreground sm:border-0 sm:bg-transparent sm:hover:bg-elevated"
          )}
        >
          <LayoutGrid className="size-4" aria-hidden="true" />
          All
        </Link>

        {shortlist.map((category) => {
          const isActive = active === category.slug;
          return (
            <Link
              key={category.id}
              href={hrefFor(category.slug)}
              scroll={false}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "tap inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[0.625rem] border px-3.5 text-sm font-semibold whitespace-nowrap transition-colors sm:h-auto sm:rounded-full sm:border-0 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm",
                isActive
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-hairline bg-elevated text-foreground/75 hover:bg-sunken hover:text-foreground sm:border-0 sm:bg-transparent sm:hover:bg-elevated"
              )}
            >
              <CategoryIcon
                name={category.icon}
                className={cn(
                  "size-4",
                  isActive ? "" : "text-brand/70"
                )}
              />
              {category.name}
            </Link>
          );
        })}

        <span className="mx-1 hidden h-5 w-px shrink-0 bg-hairline sm:block" aria-hidden="true" />

        <Link
          href="/categories"
          className="tap hidden shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold whitespace-nowrap text-brand transition-colors hover:bg-brand-muted sm:inline-flex"
        >
          <Compass className="size-4" aria-hidden="true" />
          Explore
        </Link>
      </div>
    </div>
  );
}
