import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProblemForm } from "@/components/problems/problem-form";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listCategories } from "@/lib/data/categories";
import { getRemainingCredits } from "@/actions/problems";

export const metadata: Metadata = {
  title: "Share a problem",
  description:"Describe a real problem clearly enough that someone else recognises it — and finds out how many people share it.",
  robots: { index: false, follow: true },
};

export default async function NewProblemPage() {
  const user = await getCurrentUser();

  // The composer is meaningless without an identity to attribute the post to.
  if (!user) redirect("/api/auth/google?next=/problems/new");

  const [categories, credits] = await Promise.all([
    listCategories(),
    getRemainingCredits(),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href="/problems"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to problems
      </Link>

      <header className="mt-8 mb-8">
        <p className="label mb-3 text-brand">New entry</p>
        <h1 className="display text-4xl text-foreground sm:text-5xl">
          Share a problem
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
          You do not need a solution or a plan. Describe what is hard, who it
          affects, and why it stays unsolved — the rest of the platform takes it
          from there.
        </p>
      </header>

      <ProblemForm categories={categories} viewer={user} credits={credits} />
    </div>
  );
}
