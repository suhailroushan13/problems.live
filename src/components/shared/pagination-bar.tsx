"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

/**
 * URL-driven pagination — every page is a shareable, indexable link rather than
 * transient client state.
 */
export function PaginationBar({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  if (totalPages <= 1) return null;

  function hrefFor(target: number): string {
    const params = new URLSearchParams(searchParams.toString());
    if (target <= 1) params.delete("page");
    else params.set("page", String(target));
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function go(target: number) {
    router.push(hrefFor(target), { scroll: true });
  }

  // Always show first, last, current and its neighbours; elide the rest.
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const visible = [...pages]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  return (
    <Pagination className="mt-10">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={hrefFor(Math.max(1, page - 1))}
            aria-disabled={page <= 1}
            className={page <= 1 ? "pointer-events-none opacity-40" : undefined}
            onClick={(event) => {
              event.preventDefault();
              if (page > 1) go(page - 1);
            }}
          />
        </PaginationItem>

        {visible.map((target, index) => {
          const previous = visible[index - 1];
          const gap = previous !== undefined && target - previous > 1;

          return (
            <PaginationItem key={target}>
              {gap ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  href={hrefFor(target)}
                  isActive={target === page}
                  onClick={(event) => {
                    event.preventDefault();
                    go(target);
                  }}
                >
                  {target}
                </PaginationLink>
              )}
            </PaginationItem>
          );
        })}

        <PaginationItem>
          <PaginationNext
            href={hrefFor(Math.min(totalPages, page + 1))}
            aria-disabled={page >= totalPages}
            className={
              page >= totalPages ? "pointer-events-none opacity-40" : undefined
            }
            onClick={(event) => {
              event.preventDefault();
              if (page < totalPages) go(page + 1);
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
