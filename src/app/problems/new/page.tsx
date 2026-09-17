/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProblemForm } from "@/components/problems/problem-form";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listCategories } from "@/lib/data/categories";
import { getRemainingCredits } from "@/actions/problems";

export const metadata: Metadata = {
  title: "Share a problem",
  description:
    "Describe a real problem clearly enough that someone else recognises it, and finds out how many people share it.",
  robots: { index: false, follow: true },
};

export default async function NewProblemPage() {
  redirect("/wait-list");
  /* Invite-only pause: retain the composer for the public launch.
  const user = await getCurrentUser();

  // The composer is meaningless without an identity to attribute the post to.
  if (!user) redirect("/login?next=/problems/new");

  const [categories, credits] = await Promise.all([
    listCategories(),
    getRemainingCredits(),
  ]);

  return (
    <div className="page py-8 sm:py-12">
      <header className="mt-4 mb-9 sm:mt-7 sm:mb-10">
        <h1 className="text-h1 text-foreground">Share a problem</h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
          You don&apos;t need a solution. Just tell us what&apos;s difficult,
          who it affects, and why it matters.
        </p>
      </header>

      <ProblemForm
        categories={categories}
        viewer={user}
        credits={credits}
        initialLocation={user.defaultLocation}
      />
    </div>
  );
  */
}
