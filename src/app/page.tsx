import { CategoryBar } from "@/components/navigation/category-bar";
import { ProblemsToolbar } from "@/components/problems/problems-toolbar";
import { ProblemCard } from "@/components/problems/problem-card";
import { MobileProblemsFeed } from "@/components/problems/mobile-problems-feed";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { GithubBadge } from "@/components/shared/github-badge";
import { NumberTicker } from "@/components/ui/number-ticker";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listProblems } from "@/lib/data/problems";
import { listCategories } from "@/lib/data/categories";
import { problemFiltersSchema } from "@/lib/validation/schemas";
import { formatCount } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  // The directory defaults to "Most validated" — the app's one upvote-
  // equivalent signal — rather than the sitewide "trending" default.
  const filters = problemFiltersSchema.parse({
    sort: params.sort ?? "validated",
    category: params.category,
    status: params.status,
    q: params.q,
    page: params.page,
  });

  const [user, categories, result] = await Promise.all([
    getCurrentUser(),
    listCategories(),
    listProblems(filters),
  ]);

  const activeCategory = categories.find((c) => c.slug === filters.category);
  const isFiltered = Boolean(filters.q || filters.category || filters.status);
  const isCardView = params.view === "card";

  const rangeStart = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const rangeEnd = Math.min(result.page * result.pageSize, result.total);

  // Signed-out users see the marketing landing page. Signed-in users go
  // straight to the directory, using the same desktop content rail as header.
  const isLoggedIn = Boolean(user);
  return (
    <>
      {/* Hero — logged-out only ------------------------------------------ */}
      {!isLoggedIn ? (
        <section className="page hidden pt-5 pb-4 text-left sm:block sm:pt-16 sm:pb-10 sm:text-center">
          <GithubBadge className="hidden sm:mx-auto sm:inline-flex" />

          <h1 className="mx-auto max-w-4xl text-h3 text-balance text-foreground sm:mt-6 sm:text-4xl sm:tracking-[-0.03em] lg:text-5xl">
            {activeCategory ? (
              <>
                Problems in{" "}
                <span className="text-brand">{activeCategory.name}</span>
              </>
            ) : (
              <>
                The <span className="text-brand">problems</span> directory
              </>
            )}
          </h1>

          <p className="mx-auto mt-1 max-w-xl text-[0.8125rem] text-muted-foreground sm:mt-4 sm:text-sm">
            A public directory of problems people face, share, and want solved.
          </p>
        </section>
      ) : null}

      {/* Problems directory ---------------------------------------------- */}
      <div className={cn("pb-28 sm:pb-16", isLoggedIn && "pt-4 sm:pt-10")}>
        <div className="page mt-2">
          <p className="mb-2 flex items-baseline gap-1.5 text-[0.8125rem] font-medium text-muted-foreground sm:mb-3 sm:text-sm">
            <NumberTicker
              value={result.total}
              className="num font-bold text-brand"
            />
            <span>
              {result.total === 1
                ? "live problem waiting to be solved"
                : "live problems waiting to be solved"}
            </span>
          </p>
          <ProblemsToolbar categories={categories} />
        </div>

        <CategoryBar
          categories={categories}
          activeSlug={filters.category}
          className="mt-3.5"
        />

        <div className="page mt-4">
          {result.items.length > 0 ? (
            <>
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

              <div className="mt-3 hidden flex-wrap items-center justify-between gap-3 sm:flex">
                <p className="text-xs text-muted-foreground">
                  Showing {formatCount(rangeStart)}–{formatCount(rangeEnd)} of{" "}
                  {formatCount(result.total)} problems
                </p>
              </div>

              <div className="hidden sm:block"><PaginationBar page={result.page} totalPages={result.totalPages} /></div>
            </>
          ) : isFiltered ? (
            <EmptyState
              title="Nothing matches these filters."
              description="Try widening them, or be the first to share a problem that fits."
              action={{ label: "Post a problem", href: "/problems/new" }}
              secondaryAction={{ label: "Clear filters", href: "/" }}
            />
          ) : (
            <EmptyState
              title="No problems yet."
              description="Be the first person to share a problem worth solving."
              action={{ label: "Post a problem", href: "/problems/new" }}
            />
          )}
        </div>
      </div>
    </>
  );
}
