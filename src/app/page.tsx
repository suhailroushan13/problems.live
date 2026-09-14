import { CategoryBar } from "@/components/navigation/category-bar";
import { ShareProblemForm } from "@/components/problems/share-problem-form";
import { ProblemsToolbar } from "@/components/problems/problems-toolbar";
import { PostProblemButton } from "@/components/problems/post-problem-button";
import { ProblemTable } from "@/components/problems/problem-table";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listProblems } from "@/lib/data/problems";
import { listCategories } from "@/lib/data/categories";
import { getPlatformStats } from "@/lib/data/stats";
import { problemFiltersSchema } from "@/lib/validation/schemas";
import { formatCount } from "@/lib/utils/format";

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

  const [user, categories, stats, result] = await Promise.all([
    getCurrentUser(),
    listCategories(),
    getPlatformStats(),
    listProblems(filters),
  ]);

  const activeCategory = categories.find((c) => c.slug === filters.category);
  const isFiltered = Boolean(filters.q || filters.category || filters.status);

  const rangeStart = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const rangeEnd = Math.min(result.page * result.pageSize, result.total);

  return (
    <>
      {/* Hero ----------------------------------------------------------- */}
      <section className="page pt-12 pb-10 text-center sm:pt-16">
        <h1 className="mx-auto mt-10 max-w-4xl text-2xl leading-[1.15] font-extrabold tracking-[-0.03em] text-balance text-foreground sm:text-4xl lg:text-5xl">
          {activeCategory ? (
            <>
              Problems in{" "}
              <span className="text-brand">{activeCategory.name}</span>
            </>
          ) : (
            <>
              The open list of <span className="text-brand">problems</span>{" "}
              worth solving
            </>
          )}
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-xs text-muted-foreground sm:text-sm">
          Have a problem? Share it. Have the same problem? Validate it.
        </p>

        <div className="mx-auto mt-7 max-w-4xl text-left">
          <ShareProblemForm user={user} categories={categories} />
        </div>

        <p className="num mt-4 text-xs text-muted-foreground">
          <span className="font-bold text-foreground">
            {formatCount(stats.problems)}
          </span>{" "}
          problems ·{" "}
          <span className="font-bold text-foreground">
            {formatCount(stats.validations)}
          </span>{" "}
          validations ·{" "}
          <span className="font-bold text-foreground">
            {formatCount(stats.solutions)}
          </span>{" "}
          solutions ·{" "}
          <span className="font-bold text-foreground">
            {formatCount(stats.solved)}
          </span>{" "}
          solved
        </p>
      </section>

      {/* Problems directory ---------------------------------------------- */}
      <div className="pb-16">
        <div className="page mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold tracking-[-0.02em] text-foreground sm:text-2xl">
              Problems
            </h2>
            <p className="num mt-1 text-sm text-muted-foreground">
              {formatCount(stats.problems)}{" "}
              {stats.problems === 1 ? "problem" : "problems"}
            </p>
          </div>

          <PostProblemButton
            user={user}
            categories={categories}
            label="Post a problem"
            className="pill h-10 gap-1.5 px-5 text-sm font-bold"
          />
        </div>

        <div className="page mt-5">
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
              <ProblemTable
                problems={result.items}
                startRank={(result.page - 1) * result.pageSize + 1}
              />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Showing {formatCount(rangeStart)}–{formatCount(rangeEnd)} of{" "}
                  {formatCount(result.total)} problems
                </p>
              </div>

              <PaginationBar page={result.page} totalPages={result.totalPages} />
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
