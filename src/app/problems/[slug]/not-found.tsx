
import { EmptyState } from "@/components/shared/empty-state";

export default function ProblemNotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 sm:px-6">
      <EmptyState
        title="This problem isn't here."
        description="It may have been deleted by its author, removed by a moderator, or the link might be wrong."
        action={{ label: "Explore problems", href: "/problems" }}
        secondaryAction={{ label: "Share a problem", href: "/problems/new" }}
      />
    </div>
  );
}
