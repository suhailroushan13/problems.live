import type { Metadata } from "next";
import { CategoryBar } from "@/components/navigation/category-bar";
import { ProblemSort } from "@/components/problems/problem-sort";
import { ProblemTable } from "@/components/problems/problem-table";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { listProblems } from "@/lib/data/problems";
import { listCategories } from "@/lib/data/categories";
import { problemFiltersSchema } from "@/lib/validation/schemas";
import { formatCount } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Problems",
  description:
    "Browse every problem people have shared — filter by category, status and how many people have said they have it too.",
  alternates: { canonical: "/problems" },
};

export default async function ProblemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = problemFiltersSchema.parse({
    sort: params.sort,
    category: params.category,
    status: params.status,
    country: params.country,
    scope: params.scope,
    q: params.q,
    page: params.page,
  });

  const [categories, result] = await Promise.all([
    listCategories(),
    listProblems(filters),
  ]);

  const isSearch = Boolean(filters.q);

  return (
    <div className="pb-12">
      <header className="page max-w-2xl pt-12 sm:pt-16">
        <h1 className="text-[2rem] font-extrabold tracking-[-0.035em] text-foreground sm:text-[2.75rem]">
          {isSearch ? `“${filters.q}”` : "Problems"}
        </h1>
        <p className="num mt-3 text-[0.9375rem] text-muted-foreground">
          {isSearch
            ? `${formatCount(result.total)} ${
                result.total === 1 ? "problem matches" : "problems match"
              } your search`
            : `${formatCount(result.total)} problems people are experiencing`}
        </p>
      </header>

      <CategoryBar
        categories={categories}
        activeSlug={filters.category}
        className="mt-10"
      />

      <div className="page mt-6">
        <ProblemSort />
      </div>

      {result.items.length > 0 ? (
        <>
          <div className="page mt-5">
            <ProblemTable
              problems={result.items}
              startRank={(result.page - 1) * result.pageSize + 1}
            />
            <PaginationBar page={result.page} totalPages={result.totalPages} />
          </div>
        </>
      ) : isSearch ? (
        <EmptyState
          title={`Nothing matches “${filters.q}”.`}
          description="Try fewer words — or share this problem yourself. You might be the first."
          action={{ label: "Share a problem", href: "/problems/new" }}
          secondaryAction={{ label: "Clear search", href: "/problems" }}
          className="page"
        />
      ) : (
        <EmptyState
          title="No problems here yet."
          description="Nothing matches these filters. Try widening them, or be the first to share a problem that fits."
          action={{ label: "Share a problem", href: "/problems/new" }}
          secondaryAction={{ label: "Clear filters", href: "/problems" }}
          className="page"
        />
      )}
    </div>
  );
}
