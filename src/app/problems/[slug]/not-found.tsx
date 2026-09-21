
import { EmptyState } from "@/components/shared/empty-state";

export default function ProblemNotFound() {
  return (
    <div className="page py-24">
      <EmptyState
        title="Problem not found."
        description="The problem may have been removed or the link may be incorrect."
        action={{ label: "Back to problems", href: "/problems" }}
        secondaryAction={{ label: "Post a Problem", href: "/problems/new" }}
      />
    </div>
  );
}
