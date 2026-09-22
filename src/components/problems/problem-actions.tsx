"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Flag,
  Hammer,
  MinusCircle,
  MoreHorizontal,
  Pencil,
  Link2,
  Share2,
  Trash2,
} from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ReportDialog } from "@/components/shared/report-dialog";
// Bookmarks are hidden for now — bring this back with the bookmark feature.
// import { BookmarkButton } from "./bookmark-button";
import { deleteProblem, recordProblemShare, setProblemStatus } from "@/actions/problems";
import type { ProblemStatus } from "@/lib/constants";
import { goToSignIn } from "@/lib/auth/sign-in-redirect";
import { cn } from "@/lib/utils";

const STATUS_ACTIONS: Array<{
  value: ProblemStatus;
  label: string;
  icon: typeof CheckCircle2;
}> = [
  { value: "open", label: "Mark as open", icon: MinusCircle },
  { value: "needs_collaborators", label: "Needs collaborators", icon: Hammer },
  { value: "being_solved", label: "Someone is solving this", icon: Hammer },
  { value: "solved", label: "Mark as solved", icon: CheckCircle2 },
  { value: "not_relevant", label: "No longer relevant", icon: MinusCircle },
];

export function ProblemActions({
  problemId,
  slug,
  status,
  isOwn,
  isModerator,
  isAuthenticated,
  bookmark,
  onEdit,
  triggerClassName,
  variant = "menu",
}: {
  problemId: string;
  slug: string;
  status: ProblemStatus;
  isOwn: boolean;
  isModerator: boolean;
  isAuthenticated: boolean;
  bookmark?: {
    initialCount: number;
    initialActive: boolean;
  };
  onEdit?: () => void;
  triggerClassName?: string;
  /** "report" skips the "..." menu (and edit/delete/status actions) and shows a direct report button instead. */
  variant?: "menu" | "report" | "header";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const canManage = isOwn || isModerator;

  function openReport() {
    if (!isAuthenticated) {
      goToSignIn(`/problems/${slug}`);
      return;
    }
    setReportOpen(true);
  }

  if (variant === "report") {
    if (isOwn) return null;
    return (
      <>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Report problem"
          title="Report"
          className={cn("text-muted-foreground", triggerClassName)}
          onClick={openReport}
        >
          <Flag className="size-4" />
        </Button>
        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          targetType="problem"
          targetId={problemId}
          targetLabel="problem"
        />
      </>
    );
  }

  function changeStatus(next: ProblemStatus) {
    startTransition(async () => {
      const result = await setProblemStatus({ problemId, status: next });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Status updated.");
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteProblem(problemId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Problem deleted.");
      router.push("/problems");
      router.refresh();
    });
  }

  function edit() {
    if (onEdit) {
      onEdit();
      return;
    }
    router.push(`/problems/${slug}/edit`);
  }

  async function share() {
    const url = `${window.location.origin}/problems/${slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "problems.live", url });
        if (isAuthenticated) void recordProblemShare(problemId);
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Problem link copied.");
      if (isAuthenticated) void recordProblemShare(problemId);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Couldn’t share the problem.");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/problems/${slug}`);
      toast.success("Problem link copied.");
    } catch {
      toast.error("Couldn’t copy the link.");
    }
  }

  return (
    <>
      <div className={cn("flex items-center gap-0.5", variant !== "header" && "contents")}>
        {variant === "header" && canManage ? (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Share problem"
              title="Share problem"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => void share()}
            >
              <Share2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Copy problem link"
              title="Copy link"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => void copyLink()}
            >
              <Link2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Edit problem"
              title="Edit problem"
              className="text-muted-foreground hover:text-foreground"
              disabled={pending}
              onClick={edit}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Delete problem"
              title="Delete problem"
              className="text-muted-foreground hover:bg-error-subtle hover:text-destructive"
              disabled={pending}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="More actions"
              title="More actions"
              className={cn("text-muted-foreground", triggerClassName)}
              disabled={pending}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
          {canManage ? (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Status
              </DropdownMenuLabel>
              {STATUS_ACTIONS.filter((action) => action.value !== status).map(
                (action) => (
                  <DropdownMenuItem
                    key={action.value}
                    onSelect={() => changeStatus(action.value)}
                  >
                    <action.icon className="size-4" />
                    {action.label}
                  </DropdownMenuItem>
                )
              )}
              <DropdownMenuSeparator />

              {variant !== "header" ? (
                <>
                  <DropdownMenuItem onSelect={edit}>
                    <Pencil className="size-4" /> Edit problem
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="size-4" /> Delete problem
                  </DropdownMenuItem>
                </>
              ) : null}
            </>
          ) : null}

          {!isOwn ? (
            <>
              {canManage ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem onSelect={openReport}>
                <Flag className="size-4" /> Report
              </DropdownMenuItem>
            </>
          ) : null}

          {/* Bookmarks are hidden for now — bring this back with the bookmark feature.
          {bookmark ? (
            <>
              <DropdownMenuSeparator />
              <BookmarkButton
                problemId={problemId}
                initialCount={bookmark.initialCount}
                initialActive={bookmark.initialActive}
                isAuthenticated={isAuthenticated}
                menuItem
              />
            </>
          ) : null}
          */}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this problem?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the problem along with its solutions, comments and
              validations. It cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={remove} disabled={pending}>
              {pending ? "Deleting…" : "Delete problem"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="problem"
        targetId={problemId}
        targetLabel="problem"
      />
    </>
  );
}
