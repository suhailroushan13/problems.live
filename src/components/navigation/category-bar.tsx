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
  /** Enough to be useful, few enough that "Explore" stays on screen. */
  limit = 6,
  className,
}: {
  categories: CategoryDTO[];
  activeSlug?: string;
  limit?: number;
  className?: string;
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
    <div className={cn("page", className)}>
      <div className="pill relative flex items-center gap-1 overflow-x-auto bg-sunken px-2 py-2 no-scrollbar">
        <Link
          href={hrefFor(undefined)}
          scroll={false}
          aria-current={!active ? "page" : undefined}
          className={cn(
            "tap pill inline-flex shrink-0 items-center gap-2 px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors",
            !active
              ? "bg-brand text-brand-foreground"
              : "text-foreground/70 hover:bg-elevated hover:text-foreground"
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
                "tap pill inline-flex shrink-0 items-center gap-2 px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors",
                isActive
                  ? "bg-brand text-brand-foreground"
                  : "text-foreground/70 hover:bg-elevated hover:text-foreground"
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

        <span className="mx-1 h-5 w-px shrink-0 bg-hairline" aria-hidden="true" />

        <Link
          href="/categories"
          className="tap pill inline-flex shrink-0 items-center gap-2 px-4 py-2 text-sm font-bold whitespace-nowrap text-brand transition-colors hover:bg-brand-muted"
        >
          <Compass className="size-4" aria-hidden="true" />
          Explore
        </Link>
      </div>
    </div>
  );
}
