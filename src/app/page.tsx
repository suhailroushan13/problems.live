import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryBar } from "@/components/navigation/category-bar";
import { ShareProblemForm } from "@/components/problems/share-problem-form";
import { RankingToggle } from "@/components/problems/ranking-toggle";
import { ProblemList, ProblemMini } from "@/components/problems/problem-item";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listProblems, listRecentProblems } from "@/lib/data/problems";
import { listCategories } from "@/lib/data/categories";
import { getPlatformStats } from "@/lib/data/stats";
import { formatCount } from "@/lib/utils/format";

const RANKINGS = [
  { key: "all", label: "All-time", sort: "validated" as const },
  { key: "today", label: "Trending", sort: "trending" as const },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const ranking = RANKINGS.find((r) => r.key === params.rank) ?? RANKINGS[0];
  const category =
    typeof params.category === "string" ? params.category : undefined;

  const [user, ranked, recent, categories, stats] = await Promise.all([
    getCurrentUser(),
    listProblems({ sort: ranking.sort, category, pageSize: 12 }),
    listRecentProblems(9),
    listCategories(),
    getPlatformStats(),
  ]);

  const isAuthenticated = Boolean(user);

  function rankHref(key: string) {
    const query = new URLSearchParams();
    if (key !== "all") query.set("rank", key);
    if (category) query.set("category", category);
    const q = query.toString();
    return q ? `/?${q}` : "/";
  }

  const activeCategory = categories.find((c) => c.slug === category);

  return (
    <>
      <CategoryBar categories={categories} activeSlug={category} />

      {/* Hero ----------------------------------------------------------- */}
      <section className="page pt-12 pb-10 text-center sm:pt-16">
        <RankingToggle
          options={RANKINGS.map((r) => ({
            key: r.key,
            label: r.label,
            href: rankHref(r.key),
          }))}
          activeKey={ranking.key}
        />

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

      {/* The register ---------------------------------------------------- */}
      <div className="page pb-24">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10">
          <main className="min-w-0">
            {ranked.items.length > 0 ? (
              <>
                <ProblemList
                  problems={ranked.items}
                  isAuthenticated={isAuthenticated}
                  ranked
                  compact
                />

                <div className="mt-8 flex justify-center">
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="pill h-10 border-hairline bg-elevated px-6 text-xs font-bold"
                  >
                    <Link href={`/problems?sort=${ranking.sort}`}>
                      See all {formatCount(ranked.total)} problems
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <EmptyState
                title="Nothing here yet."
                description="No problems match this filter. Be the first to share one."
                action={{ label: "Share a problem", href: "/problems/new" }}
              />
            )}
          </main>

          {/* Sidebar ---------------------------------------------------- */}
          {recent.length > 0 ? (
            <aside className="hidden min-w-0 lg:block">
              <div className="rounded-3xl bg-sunken/60 p-4">
                <div className="mb-2 flex items-center justify-between gap-3 px-2">
                  <h2 className="flex items-center gap-2 text-xs font-extrabold tracking-[-0.015em] text-foreground">
                    <span
                      className="size-2 rounded-full bg-brand"
                      aria-hidden="true"
                    />
                    Recently added
                  </h2>
                  <Link
                    href="/problems?sort=newest"
                    className="inline-flex items-center gap-0.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-brand"
                  >
                    See all
                    <ChevronRight className="size-3" aria-hidden="true" />
                  </Link>
                </div>

                <ul>
                  {recent.map((problem, index) => (
                    <ProblemMini
                      key={problem.id}
                      problem={problem}
                      rank={index + 1}
                      compact
                    />
                  ))}
                </ul>
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </>
  );
}
