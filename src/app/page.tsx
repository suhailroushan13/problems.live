import Link from "next/link";
import { CategoryBar } from "@/components/navigation/category-bar";
import { ProblemsToolbar } from "@/components/problems/problems-toolbar";
import { ProblemCard } from "@/components/problems/problem-card";
import { MobileProblemsFeed } from "@/components/problems/mobile-problems-feed";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { GithubBadge } from "@/components/shared/github-badge";
// import { SignInSoundControl } from "@/components/auth/sign-in-sound-control";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Button } from "@/components/ui/button";
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

  const filters = problemFiltersSchema.parse({
    sort: params.sort ?? "trending",
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
  const desktopItems = isLoggedIn ? result.items : result.items.slice(0, 5);
  return (
    <>
      {/* Hero — logged-out only ------------------------------------------ */}
      {!isLoggedIn ? (
        <>
          <section className="page pt-3 pb-3 sm:hidden">
            <div className="relative overflow-hidden rounded-2xl border border-hairline bg-elevated px-4 py-4 shadow-[0_1px_0_rgb(0_0_0_/_0.02)]">
              <span className="pointer-events-none absolute -top-10 -right-8 size-28 rounded-full bg-brand-muted blur-2xl" aria-hidden="true" />
              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <p className="label text-brand">Open directory</p>
                  <span className="num rounded-full border border-brand-border bg-brand-muted px-2.5 py-1 text-[0.6875rem] font-bold text-brand">
                    {formatCount(result.total)} live
                  </span>
                </div>
                <h1 className="mt-3 max-w-[16rem] text-[1.5rem] leading-[1.05] font-bold tracking-[-0.04em] text-foreground">
                  {activeCategory ? (
                    <>Problems in <span className="text-brand">{activeCategory.name}</span></>
                  ) : (
                    <>Problems worth <span className="text-brand">solving.</span></>
                  )}
                </h1>
                <p className="mt-2 max-w-[18rem] text-xs leading-relaxed text-muted-foreground">
                  Real problems, shared by the people living with them.
                </p>
              </div>
            </div>
          </section>

          <section className="page hidden pt-16 pb-10 text-center sm:block">
            <GithubBadge className="sm:translate-y-3" />
            <h1
              className={cn(
                "mx-auto mt-6 max-w-4xl text-4xl leading-[1.08] font-bold tracking-[-0.03em] text-foreground lg:text-5xl",
                activeCategory ? "text-balance" : "whitespace-nowrap"
              )}
            >
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
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Real problems people face, share, and want solved.
            </p>
          </section>
        </>
      ) : null}

      {/* Problems directory ---------------------------------------------- */}
      <div className={cn(isLoggedIn ? "pb-28 pt-3 sm:pb-16 sm:pt-10" : "pb-6 sm:pb-16")}>
        <div className="page mt-2 sm:mt-2">
          <p className="mb-3 hidden items-baseline gap-1.5 text-[0.8125rem] font-medium text-muted-foreground sm:flex sm:text-sm">
            <NumberTicker
              value={result.total}
              className="num font-bold text-brand"
            />
            <span>
              {result.total === 1
                ? "problem waiting to be solved"
                : "problems waiting to be solved"}
            </span>
          </p>
          <ProblemsToolbar categories={categories} />
        </div>

        <CategoryBar
          categories={categories}
          activeSlug={filters.category}
          className={cn("mt-3 sm:mt-3.5", !isLoggedIn && "hidden sm:block")}
        />

        <div className="page mt-3 sm:mt-4">
          {result.items.length > 0 ? (
            <>
              <p className="num mb-2 text-sm font-semibold text-muted-foreground sm:hidden">
                Problems <span aria-hidden="true">·</span> {formatCount(result.total)}
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
                {desktopItems.map((problem, index) => {
                  const isSignInPreview = !isLoggedIn && index === 4;

                  if (isSignInPreview) {
                    return (
                      <div key={problem.id} className="relative overflow-hidden rounded-xl">
                        <div aria-hidden="true" inert className="pointer-events-none select-none blur-sm">
                          <ProblemCard
                            problem={problem}
                            isAuthenticated={false}
                            isModerator={false}
                          />
                        </div>
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/40 px-4 text-center backdrop-blur-[1px]">
                          <p className="text-sm font-semibold text-foreground">Sign in to see more problems</p>
                          <Button asChild size="sm">
                            <Link href="/login?next=%2F">Sign in</Link>
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <ProblemCard
                      key={problem.id}
                      problem={problem}
                      isAuthenticated={isLoggedIn}
                      isModerator={Boolean(user?.isModerator)}
                    />
                  );
                })}
              </div>

              <div className="mt-3 hidden flex-wrap items-center justify-between gap-3 sm:flex">
                <p className="text-xs text-muted-foreground">
                  Showing {formatCount(isLoggedIn ? rangeStart : Math.min(4, result.items.length))}{isLoggedIn ? `–${formatCount(rangeEnd)}` : ""} of{" "}
                  {formatCount(result.total)} problems
                </p>
              </div>

              {isLoggedIn ? <div className="hidden sm:block"><PaginationBar page={result.page} totalPages={result.totalPages} /></div> : null}
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
              action={{ label: "Join the waitlist", href: "/wait-list" }}
            />
          )}
        </div>
      </div>
    </>
  );
}
