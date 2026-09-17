import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth/current-user";
import type { CategoryDTO } from "@/types";

/**
 * Signed-out visitors choose a sign-in method; signed-in visitors use the
 * full-page composer, which has room for drafts, image uploads, and preview.
 */
export function PostProblemButton({
  user,
  label = "Post problem",
  className,
}: {
  user: SessionUser | null;
  categories: CategoryDTO[];
  /** Full-width label text; a short "Post" always shows on phones. */
  label?: string;
  className?: string;
}) {
  if (!user) {
    return (
      <Button
        asChild
        size="sm"
        className={cn("gap-1.5 whitespace-nowrap", className)}
      >
        <a href="/api/auth/google?next=%2Fproblems%2Fnew">
          <span className="hidden sm:inline">Sign in with Google</span>
          <span className="sm:hidden">Sign in</span>
        </a>
      </Button>
    );
  }

  return <Button asChild size="sm" className={cn("gap-1.5 whitespace-nowrap", className)}><Link href="/problems/new"><Plus className="size-3.5" /><span className="hidden sm:inline">{label}</span><span className="sm:hidden">Post</span></Link></Button>;
}
