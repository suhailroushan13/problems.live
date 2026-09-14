
import { EmptyState } from "@/components/shared/empty-state";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 sm:px-6">
      <p className="label mb-6 text-center text-brand">404</p>
      <EmptyState
        title="This page doesn't exist."
        description="The link may be broken, or whatever was here has since been removed."
        action={{ label: "Go home", href: "/" }}
        secondaryAction={{ label: "Explore problems", href: "/problems" }}
      />
    </div>
  );
}
