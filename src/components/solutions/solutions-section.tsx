"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CommentForm } from "@/components/comments/comment-form";
import { CommentItem } from "@/components/comments/comment-item";
import { SolutionCard } from "./solution-card";
import { SolutionDialog } from "./solution-dialog";
import {
  SOLUTION_SORTS,
  SOLUTION_SORT_LABELS,
  type SolutionSort,
} from "@/lib/constants";
import { formatCount } from "@/lib/utils/format";
import type { SessionUser } from "@/lib/auth/current-user";
import type { CommentDTO, SolutionDTO } from "@/types";
import { goToSignIn } from "@/lib/auth/sign-in-redirect";

/**
 * Solutions get their own region of the page, above the general discussion:
 * "what can I do about it" ranks higher than "what do people think".
 */
export function SolutionsSection({
  problemId,
  problemTitle,
  solutions,
  solutionComments,
  user,
  canAccept,
}: {
  problemId: string;
  problemTitle: string;
  solutions: SolutionDTO[];
  solutionComments: Record<string, CommentDTO[]>;
  user: SessionUser | null;
  canAccept: boolean;
}) {
  const pathname = usePathname();
  const [sort, setSort] = useState<SolutionSort>("helpful");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // The full list is already loaded (capped server-side), so re-sorting is a
  // local operation rather than another round trip.
  const sorted = useMemo(() => {
    const copy = [...solutions];
    copy.sort((a, b) => {
      if (a.isAccepted !== b.isAccepted) return Number(b.isAccepted) - Number(a.isAccepted);
      if (sort === "newest") {
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      }
      if (sort === "trending") {
        return b.hotScore - a.hotScore;
      }
      return b.helpfulCount - a.helpfulCount;
    });
    return copy;
  }, [solutions, sort]);

  function openComposer() {
    if (!user) {
      goToSignIn(pathname);
      return;
    }
    setDialogOpen(true);
  }

  return (
    <section id="solutions" className="scroll-mt-24">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-[-0.02em] text-foreground">
            Solutions
          </h2>
          <p className="num mt-1 text-[0.8125rem] text-muted-foreground">
            {formatCount(solutions.length)}{" "}
            {solutions.length === 1 ? "solution proposed" : "solutions proposed"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {solutions.length > 1 ? (
            <Select
              value={sort}
              onValueChange={(value) => setSort(value as SolutionSort)}
            >
              <SelectTrigger
                aria-label="Sort solutions"
                className="pill h-11! w-auto border-hairline bg-elevated px-5 text-sm font-semibold shadow-none"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOLUTION_SORTS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {SOLUTION_SORT_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          <Button
            size="lg"
            variant="outline"
            onClick={openComposer}
            className="pill h-11 gap-2 border-hairline bg-elevated px-5 font-bold"
          >
            <Plus className="size-4" aria-hidden="true" />
            Suggest a solution
          </Button>
        </div>
      </div>

      {sorted.length > 0 ? (
        <div className="divide-y divide-hairline">
          {sorted.map((solution) => {
            const thread = solutionComments[solution.id] ?? [];
            const isOpen = expanded === solution.id;

            return (
              <div key={solution.id}>
                <SolutionCard
                  solution={solution}
                  isAuthenticated={Boolean(user)}
                  canAccept={canAccept}
                  problemId={problemId}
                  onDiscuss={() =>
                    setExpanded(isOpen ? null : solution.id)
                  }
                />

                {isOpen ? (
                  <div className="mb-6 rounded-lg bg-sunken p-4">
                    <CommentForm
                      problemId={problemId}
                      solutionId={solution.id}
                      user={user}
                      compact
                      autoFocus
                      placeholder="What do you think of this solution?"
                    />
                    {thread.length > 0 ? (
                      <div className="mt-3">
                        {thread.map((comment) => (
                          <CommentItem
                            key={comment.id}
                            comment={comment}
                            user={user}
                            problemId={problemId}
                            solutionId={solution.id}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-10">
          <p className="text-[0.9375rem] font-medium text-foreground">
            No solutions yet.
          </p>
          <p className="mt-2 max-w-md text-[0.9375rem] leading-relaxed text-muted-foreground">
            If you know how this could be fixed — an idea, an existing product,
            something you are building — write it down.
          </p>
          <Button
            size="lg"
            variant="outline"
            onClick={openComposer}
            className="pill mt-6 h-12 gap-2 border-hairline bg-elevated px-6 font-bold"
          >
            <Plus className="size-4" aria-hidden="true" />
            Suggest a solution
          </Button>
        </div>
      )}

      <SolutionDialog
        problemId={problemId}
        problemTitle={problemTitle}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </section>
  );
}
