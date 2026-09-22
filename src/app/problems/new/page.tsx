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
    <div className="page py-4 sm:py-8 lg:h-[calc(100dvh-3.75rem)] lg:overflow-y-auto">
      <header className="mb-4 sm:mb-5">
        <h1 className="text-3xl font-bold tracking-[-0.035em] text-foreground sm:text-4xl">
          Share a problem
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
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
