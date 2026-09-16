import type { Metadata } from "next";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SolutionCard } from "@/components/solutions/solution-card";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listTopSolutions } from "@/lib/data/solutions";
import { solutionSortSchema } from "@/lib/validation/schemas";
import { formatCount } from "@/lib/utils/format";
import { SOLUTION_SORTS, SOLUTION_SORT_LABELS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Solutions",
  description:"Every solution people have proposed to the problems on problems.live, ranked by how many found them useful.",
  alternates: { canonical: "/solutions" },
};

export default async function SolutionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const sort = solutionSortSchema.parse(query.sort);
  const page = Math.max(1, Number(query.page) || 1);

  const [user, result] = await Promise.all([
    getCurrentUser(),
    listTopSolutions({ sort, page }),
  ]);

  return (
    <div className="page py-12 sm:py-16">
      <header className="max-w-2xl">
        <h1 className="text-[2rem] font-bold tracking-[-0.035em] text-foreground sm:text-[2.75rem]">
          Solutions
        </h1>
        <p className="num mt-3 text-[0.9375rem] text-muted-foreground">
          {formatCount(result.total)}{" "}
          {result.total === 1 ? "solution" : "solutions"} proposed so far
        </p>
      </header>

      <Tabs value={sort} className="mt-10 mb-2 border-t border-rule pt-6">
        <TabsList className="no-scrollbar max-w-full overflow-x-auto">
          {SOLUTION_SORTS.map((value) => (
            <TabsTrigger key={value} value={value} asChild>
              <Link
                href={value === "helpful" ? "/solutions" : `/solutions?sort=${value}`}
                scroll={false}
              >
                {SOLUTION_SORT_LABELS[value]}
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {result.items.length > 0 ? (
        <>
          <div className="divide-y divide-hairline">
            {result.items.map((solution) => (
              <div key={solution.id}>
                {solution.problemTitle && solution.problemSlug ? (
                  <Link
                    href={`/problems/${solution.problemSlug}`}
                    className="mt-6 block truncate text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    On: {solution.problemTitle}
                  </Link>
                ) : null}
                <SolutionCard
                  solution={solution}
                  isAuthenticated={Boolean(user)}
                  className="pt-2"
                />
              </div>
            ))}
          </div>
          <PaginationBar page={result.page} totalPages={result.totalPages} />
        </>
      ) : (
        <EmptyState
          title="No solutions yet."
          description="Find a problem you know how to fix, and be the first to suggest how."
          action={{ label: "Explore problems", href: "/problems" }}
        />
      )}
    </div>
  );
}
