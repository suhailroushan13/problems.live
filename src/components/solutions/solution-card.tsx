"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AuthorLine } from "@/components/shared/author-line";
import { SafeText } from "@/components/shared/safe-text";
import { PostImages } from "@/components/shared/post-images";
import { ReportDialog } from "@/components/shared/report-dialog";
import { SolutionStatusDot } from "@/components/problems/status-dot";
import { HelpfulButton } from "./helpful-button";
import { deleteSolution } from "@/actions/solutions";
import { setProblemStatus } from "@/actions/problems";
import { formatCount } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { SolutionDTO } from "@/types";

/**
 * Solutions are first-class objects, not comments — they carry a title, an
 * author, a stage, their own vote count and their own discussion. Presented as
 * a divider-separated entry rather than a card, so a page of them reads as a
 * list rather than a wall of boxes.
 */
export function SolutionCard({
  solution,
  isAuthenticated,
  canAccept,
  problemId,
  onDiscuss,
  className,
}: {
  solution: SolutionDTO;
  isAuthenticated: boolean;
  canAccept?: boolean;
  problemId?: string;
  onDiscuss?: (solution: SolutionDTO) => void;
  className?: string;
}) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await deleteSolution(solution.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Solution deleted.");
      router.refresh();
    });
  }

  function accept() {
    if (!problemId) return;
    startTransition(async () => {
      const result = await setProblemStatus({
        problemId,
        status: "solved",
        acceptedSolutionId: solution.id,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Marked as solved by this solution.");
      router.refresh();
    });
  }

  return (
    <article
      id={`solution-${solution.id}`}
      className={cn(
        "py-6",
        solution.isAccepted && "-mx-4 rounded-xl bg-status-solved/[0.05] px-4 sm:-mx-5 sm:px-5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[1.0625rem] leading-snug font-bold tracking-[-0.015em] text-foreground">
            {solution.title}
          </h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-muted-foreground">
            {solution.isAccepted ? (
              <span className="inline-flex items-center gap-1.5 text-status-solved">
                <Check className="size-3.5" aria-hidden="true" />
                Accepted solution
              </span>
            ) : null}
            <SolutionStatusDot status={solution.status} />
          </div>

          {solution.moderationStatus === "pending" ? (
            <p className="mt-2 text-[0.8125rem] text-muted-foreground">
              Awaiting review, only you can see this.
            </p>
          ) : null}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Solution actions"
              className="size-9 shrink-0 text-muted-foreground"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {canAccept && !solution.isAccepted ? (
              <DropdownMenuItem onSelect={accept} disabled={pending}>
                Mark problem as solved
              </DropdownMenuItem>
            ) : null}
            {solution.isOwn ? (
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setConfirmDelete(true)}
              >
                Delete solution
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => setReportOpen(true)}>
                Report
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SafeText className="mt-3">{solution.description}</SafeText>

      {solution.images.length > 0 ? (
        <PostImages images={solution.images} className="mt-4" />
      ) : null}

      {solution.url ? (
        <a
          href={solution.url}
          target="_blank"
          rel="nofollow noopener noreferrer ugc"
          className="mt-3 inline-block max-w-full truncate text-[0.8125rem] text-brand underline decoration-brand/30 underline-offset-2 transition-colors hover:decoration-brand"
        >
          {solution.url.replace(/^https?:\/\//, "")}
        </a>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <p className="text-sm text-foreground">
          <span className="num font-semibold">
            {formatCount(solution.helpfulCount)}
          </span>{" "}
          <span className="text-muted-foreground">
            {solution.helpfulCount === 1
              ? "person found this useful"
              : "people found this useful"}
          </span>
        </p>

        <div className="flex items-center gap-2">
          <HelpfulButton
            targetId={solution.id}
            initialCount={solution.helpfulCount}
            initialActive={solution.hasVoted}
            isAuthenticated={isAuthenticated}
          />

          {onDiscuss ? (
            <Button
              variant="ghost"
              size="lg"
              onClick={() => onDiscuss(solution)}
              className="h-10 px-3 text-sm text-muted-foreground"
            >
              Discuss
              {solution.commentCount > 0 ? (
                <span className="num ml-1.5">{solution.commentCount}</span>
              ) : null}
            </Button>
          ) : solution.problemSlug ? (
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="h-10 px-3 text-sm text-muted-foreground"
            >
              <Link
                href={`/problems/${solution.problemSlug}#solution-${solution.id}`}
              >
                Discuss
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <AuthorLine
        author={solution.author}
        createdAt={solution.createdAt}
        editedAt={solution.editedAt}
        className="mt-4"
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this solution?</AlertDialogTitle>
            <AlertDialogDescription>
              The solution and its discussion will be removed. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={remove} disabled={pending}>
              {pending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="solution"
        targetId={solution.id}
        targetLabel="solution"
      />
    </article>
  );
}
