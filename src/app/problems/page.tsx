import type { Metadata } from "next";
import { CategoryBar } from "@/components/navigation/category-bar";
import { ProblemsToolbar } from "@/components/problems/problems-toolbar";
import { ProblemCard } from "@/components/problems/problem-card";
import { MobileProblemsFeed } from "@/components/problems/mobile-problems-feed";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listProblems } from "@/lib/data/problems";
import { listCategories } from "@/lib/data/categories";
import { problemFiltersSchema } from "@/lib/validation/schemas";
import { formatCount } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Problems",
  description:
    "Browse every problem people have shared, filter by category, status and how many people have said they have it too.",
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

  const [user, categories, result] = await Promise.all([
    getCurrentUser(),
    listCategories(),
    listProblems(filters),
  ]);

  const isSearch = Boolean(filters.q);
  const isCardView = params.view === "card";

  return (
    <div className="pb-28 sm:pb-12">
      <header className="page hidden pt-5 sm:block sm:pt-16">
        <h1 className="text-h3 text-foreground sm:text-[2.75rem] sm:tracking-[-0.035em]">
          {isSearch ? `“${filters.q}”` : "Problems"}
        </h1>
        <p className="num mt-1 text-[0.8125rem] text-muted-foreground sm:mt-3 sm:text-[0.9375rem]">
          {isSearch
            ? `${formatCount(result.total)} ${
                result.total === 1 ? "problem matches" : "problems match"
              } your search`
            : `${formatCount(result.total)} problems people are experiencing`}
        </p>
      </header>

      <div className="page mt-3 sm:mt-6">
        <ProblemsToolbar categories={categories} />
      </div>

      <CategoryBar
        categories={categories}
        activeSlug={filters.category}
        className="mt-3 sm:mt-10"
      />

      {result.items.length > 0 ? (
        <>
          <div className="page mt-4 sm:mt-5">
            <p className="num mb-1 text-[0.8125rem] font-medium text-muted-foreground sm:hidden">
              {formatCount(result.total)} {result.total === 1 ? "problem" : "problems"}
            </p>
            <MobileProblemsFeed
              key={JSON.stringify(filters)}
              initial={result}
              filters={filters}
              isAuthenticated={Boolean(user)}
              isModerator={Boolean(user?.isModerator)}
            />
            <div
              className={cn(
                isCardView
                  ? "hidden gap-3 sm:grid lg:grid-cols-2"
                  : "hidden space-y-3 sm:block",
              )}
            >
              {result.items.map((problem) => (
                <ProblemCard
                  key={problem.id}
                  problem={problem}
                  isAuthenticated={Boolean(user)}
                  isModerator={Boolean(user?.isModerator)}
                />
              ))}
            </div>
            <div className="hidden sm:block"><PaginationBar page={result.page} totalPages={result.totalPages} /></div>
          </div>
        </>
      ) : isSearch ? (
        <EmptyState
          title={`Nothing matches “${filters.q}”.`}
          description="Try fewer words, or share this problem yourself. You might be the first."
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
