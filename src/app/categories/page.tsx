import type { Metadata } from "next";
import { CategoryCard } from "@/components/shared/category-card";
import { EmptyState } from "@/components/shared/empty-state";
import { listCategoriesByPopularity } from "@/lib/data/categories";
import { formatCount } from "@/lib/utils/format";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Categories",
  description:"Every problem on problems.live lives in a category — technology, housing, health, work, transport and more.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const categories = await listCategoriesByPopularity(100);
  const total = categories.reduce((sum, c) => sum + c.problemCount, 0);

  return (
    <div className="page max-w-4xl py-12 sm:py-16">
      <header className="max-w-2xl">
        <h1 className="text-[2rem] font-extrabold tracking-[-0.035em] text-foreground sm:text-[2.75rem]">
          Categories
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">
          {formatCount(total)} problems across {categories.length} categories.
          Start where you have first-hand experience — that is where your vote
          means the most.
        </p>
      </header>

      {categories.length > 0 ? (
        <div className="mt-10 grid gap-x-12 border-t border-rule sm:grid-cols-2">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No categories yet."
          description="Categories appear once an admin approves them."
          action={{ label: "Explore problems", href: "/problems" }}
        />
      )}
    </div>
  );
}
