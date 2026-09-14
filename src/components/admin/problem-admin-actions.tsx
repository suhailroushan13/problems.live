"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Star, StarOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  adminSetProblemStatus,
  approveContent,
  removeContent,
  toggleFeatured,
} from "@/actions/admin";
import {
  PROBLEM_STATUSES,
  PROBLEM_STATUS_LABELS,
  type ProblemStatus,
} from "@/lib/constants";
import type { AdminProblem } from "@/lib/data/admin";

export function ProblemAdminActions({
  problem,
  isAdmin,
}: {
  problem: AdminProblem;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "That didn't work.");
        return;
      }
      toast.success(result.message ?? "Done.");
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Problem actions"
          disabled={pending}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Status
        </DropdownMenuLabel>
        {PROBLEM_STATUSES.filter((value) => value !== problem.status).map(
          (value) => (
            <DropdownMenuItem
              key={value}
              onSelect={() =>
                run(() => adminSetProblemStatus(problem.id, value as ProblemStatus))
              }
            >
              {PROBLEM_STATUS_LABELS[value]}
            </DropdownMenuItem>
          )
        )}

        <DropdownMenuSeparator />

        {isAdmin ? (
          <DropdownMenuItem onSelect={() => run(() => toggleFeatured(problem.id))}>
            {problem.featured ? (
              <>
                <StarOff className="size-4" /> Unfeature
              </>
            ) : (
              <>
                <Star className="size-4" /> Feature
              </>
            )}
          </DropdownMenuItem>
        ) : null}

        {problem.moderationStatus === "approved" ? (
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => run(() => removeContent("problem", problem.id))}
          >
            Remove from public
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onSelect={() => run(() => approveContent("problem", problem.id))}
          >
            Restore / approve
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
