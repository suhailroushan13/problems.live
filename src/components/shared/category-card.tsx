import Link from "next/link";
import { formatCount } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { CategoryDTO } from "@/types";

/** A directory row, not a card. Name first, count as quiet support. */
export function CategoryCard({
  category,
  className,
}: {
  category: CategoryDTO;
  className?: string;
}) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className={cn(
        "group tap block border-b border-hairline py-4 transition-colors",
        className
      )}
    >
      <span className="flex items-baseline justify-between gap-4">
        <span className="text-[0.9375rem] font-medium text-foreground transition-colors group-hover:text-brand">
          {category.name}
        </span>
        <span className="num shrink-0 text-[0.8125rem] text-muted-foreground">
          {formatCount(category.problemCount)}
        </span>
      </span>
      {category.description ? (
        <span className="mt-1 block max-w-lg text-[0.8125rem] leading-relaxed text-muted-foreground">
          {category.description}
        </span>
      ) : null}
    </Link>
  );
}
