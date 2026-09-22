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
  const user = await getCurrentUser();

  // The composer is meaningless without an identity to attribute the post to.
  if (!user) redirect("/login?next=/problems/new");
  if (!user.isOnboarded) redirect("/onboard?next=/problems/new");

  const [categories, credits] = await Promise.all([
    listCategories(),
    getRemainingCredits(),
  ]);

  return (
    <div className="page py-6 sm:py-10">
      <header className="mt-2 mb-6 sm:mt-4 sm:mb-8">
        <h1 className="text-h1 text-foreground">Share a problem</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Describe what&apos;s hard.
        </p>
      </header>

      <ProblemForm
        categories={categories}
        viewer={user}
        credits={credits}
        initialLocation={user.defaultLocation}
        compact
      />
    </div>
  );
}
