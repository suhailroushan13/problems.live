import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProblemList } from "@/components/problems/problem-item";
import { SolutionCard } from "@/components/solutions/solution-card";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getCategoryBySlug, listAllCategorySlugs } from "@/lib/data/categories";
import { listProblems } from "@/lib/data/problems";
import { listTopSolutions } from "@/lib/data/solutions";
import { problemFiltersSchema } from "@/lib/validation/schemas";
import { formatCount } from "@/lib/utils/format";
import { PROBLEM_SORTS, PROBLEM_SORT_LABELS } from "@/lib/constants";
import { env, APP_NAME } from "@/lib/env";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 120;

/** Pre-render the category index so these SEO pages are static and fast. */
export async function generateStaticParams() {
  try {
    const slugs = await listAllCategorySlugs();
    return slugs.map(({ slug }) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    return { title: "Category not found", robots: { index: false } };
  }

  const description =
    category.description ??
    `${formatCount(category.problemCount)} real problems people have shared in ${category.name}.`;

  return {
    title: `${category.name} problems`,
    description,
    alternates: { canonical: `/categories/${category.slug}` },
    openGraph: {
      type: "website",
      title: `${category.name} problems · ${APP_NAME}`,
      description,
      url: `${env.appUrl}/categories/${category.slug}`,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const filters = problemFiltersSchema.parse({
    sort: query.sort,
    page: query.page,
  });

  const [user, result, solutions] = await Promise.all([
    getCurrentUser(),
    listProblems({ ...filters, category: category.slug }),
    listTopSolutions({ limit: 3 }),
  ]);

  return (
    <div className="page max-w-4xl py-12 sm:py-16">
      <Link
        href="/categories"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        All categories
      </Link>

      <header className="mt-8 max-w-2xl">
        <h1 className="text-[2rem] font-extrabold tracking-[-0.035em] text-foreground sm:text-[2.75rem]">
          {category.name}
        </h1>
        {category.description ? (
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">
            {category.description}
          </p>
        ) : null}
        <p className="num mt-3 text-[0.8125rem] text-muted-foreground">
          {formatCount(result.total)}{" "}
          {result.total === 1 ? "problem" : "problems"}
        </p>
      </header>

      <Tabs value={filters.sort} className="mt-10 mb-2 border-t border-rule pt-6">
        <TabsList className="no-scrollbar max-w-full overflow-x-auto">
          {PROBLEM_SORTS.slice(0, 4).map((value) => (
            <TabsTrigger key={value} value={value} asChild>
              <Link
                href={
                  value === "trending"
                    ? `/categories/${category.slug}`
                    : `/categories/${category.slug}?sort=${value}`
                }
                scroll={false}
              >
                {PROBLEM_SORT_LABELS[value]}
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {result.items.length > 0 ? (
        <>
          <ProblemList
            problems={result.items}
            isAuthenticated={Boolean(user)}
          />
          <PaginationBar page={result.page} totalPages={result.totalPages} />
        </>
      ) : (
        <EmptyState
          title={`No problems in ${category.name} yet.`}
          description="Be the first person to share one — it takes two minutes."
          action={{ label: "Share a problem", href: "/problems/new" }}
        />
      )}

      {solutions.items.length > 0 ? (
        <section className="mt-16 border-t border-rule pt-10">
          <h2 className="text-xl font-bold tracking-[-0.02em] text-foreground">Top solutions</h2>
          <div className="divide-y divide-hairline">
            {solutions.items.map((solution) => (
              <SolutionCard
                key={solution.id}
                solution={solution}
                isAuthenticated={Boolean(user)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
