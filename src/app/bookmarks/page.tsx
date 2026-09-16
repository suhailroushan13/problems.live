import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bookmark } from "lucide-react";
import { ProblemCard } from "@/components/problems/problem-card";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listBookmarkedByUser } from "@/lib/data/problems";

export const metadata: Metadata = {
  title: "Saved problems",
  robots: { index: false, follow: false },
};

/** A signed-in user's private saved-problem list. */
export default async function BookmarksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/bookmarks");

  const problems = await listBookmarkedByUser(user.id);

  return (
    <div className="page py-12 sm:py-16">
      <header className="mb-8">
        <div className="flex items-center gap-2.5">
          <Bookmark className="size-5 text-brand" aria-hidden="true" />
          <h1 className="text-[2rem] font-bold tracking-[-0.035em] text-foreground sm:text-[2.75rem]">
            Saved problems
          </h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Only you can see the problems you save here.
        </p>
      </header>

      {problems.length > 0 ? (
        <div className="space-y-2">
          {problems.map((problem) => (
            <ProblemCard
              key={problem.id}
              problem={problem}
              isAuthenticated
              isModerator={Boolean(user.isModerator)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No saved problems yet."
          description="Bookmark a problem to keep it private and find it again here."
          action={{ label: "Explore problems", href: "/problems" }}
        />
      )}
    </div>
  );
}
