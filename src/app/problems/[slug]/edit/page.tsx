import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ProblemForm } from "@/components/problems/problem-form";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getProblemBySlug } from "@/lib/data/problems";
import { listCategories } from "@/lib/data/categories";

export const metadata: Metadata = {
  title: "Edit problem",
  robots: { index: false, follow: false },
};

export default async function EditProblemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();

  if (!user) redirect(`/api/auth/google?next=/problems/${slug}/edit`);

  const problem = await getProblemBySlug(slug);
  if (!problem) notFound();

  // Ownership is re-checked in the action too — this only avoids rendering a
  // form the user could never submit.
  if (!problem.isOwn && !user.isModerator) {
    redirect(`/problems/${slug}`);
  }

  const categories = await listCategories();

  return (
    <div className="page py-4 sm:py-8 lg:h-[calc(100dvh-3.75rem)] lg:overflow-y-auto">
      <header className="mb-4 sm:mb-5">
        <h1 className="text-3xl font-bold tracking-[-0.035em] text-foreground sm:text-4xl">
          Edit problem
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Refine what&apos;s hard. Significant changes are reviewed again.
        </p>
      </header>

      <ProblemForm
        categories={categories}
        viewer={user}
        credits={user.problemCredits}
        problem={problem}
        compact
      />
    </div>
  );
}
