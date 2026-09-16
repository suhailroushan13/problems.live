import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
    <div className="page py-10 sm:py-14">
      <Link
        href={`/problems/${problem.slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to problem
      </Link>

      <header className="mt-8 mb-8">
        <p className="label mb-3 text-brand">Editing</p>
        <h1 className="display text-4xl text-foreground sm:text-5xl">
          Edit problem
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Substantial edits are re-checked by moderation before going back
          public.
        </p>
      </header>

      <ProblemForm
        categories={categories}
        viewer={user}
        credits={user.problemCredits}
        problem={problem}
      />
    </div>
  );
}
