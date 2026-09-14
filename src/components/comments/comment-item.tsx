"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CornerDownRight, Flag, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { ReportDialog } from "@/components/shared/report-dialog";
import { HelpfulButton } from "@/components/solutions/helpful-button";
import { CommentForm } from "./comment-form";
import { deleteComment, updateComment } from "@/actions/comments";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth/current-user";
import type { CommentDTO } from "@/types";

export function CommentItem({
  comment,
  user,
  problemId,
  solutionId,
  depth = 0,
}: {
  comment: CommentDTO;
  user: Pick<SessionUser, "name" | "username" | "avatar"> | null;
  problemId: string;
  solutionId?: string | null;
  depth?: number;
}) {
  const router = useRouter();
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function saveEdit() {
    startTransition(async () => {
      const result = await updateComment({
        commentId: comment.id,
        content: draft.trim(),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.message) toast.info(result.message);
      setEditing(false);
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteComment(comment.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Comment deleted.");
      router.refresh();
    });
  }

  if (comment.isDeleted) {
    return (
      <div id={`comment-${comment.id}`} className="py-4">
        <p className="text-sm text-muted-foreground/70 italic">
          This comment was deleted.
        </p>
        {comment.replies.length > 0 ? (
          <div className="mt-3 space-y-1 border-l border-hairline pl-4 sm:pl-5">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                user={user}
                problemId={problemId}
                solutionId={solutionId}
                depth={depth + 1}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      id={`comment-${comment.id}`}
      className={cn("py-4", depth === 0 && "border-t border-rule first:border-t-0")}
    >
      <div className="flex items-start justify-between gap-3">
        <AuthorLine
          author={comment.author}
          createdAt={comment.createdAt}
          editedAt={comment.editedAt}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Comment actions"
              className="-mt-1 shrink-0 text-muted-foreground opacity-60 transition-opacity hover:opacity-100"
            >
              <MoreHorizontal className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {comment.isOwn ? (
              <>
                <DropdownMenuItem
                  onSelect={() => {
                    setDraft(comment.content);
                    setEditing(true);
                  }}
                >
                  <Pencil className="size-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setConfirmDelete(true)}
                >
                  <Trash2 className="size-4" /> Delete
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onSelect={() => setReportOpen(true)}>
                <Flag className="size-4" /> Report
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {editing ? (
        <div className="mt-2 space-y-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, 4000))}
            rows={3}
            className="resize-none"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={saveEdit}
              disabled={pending || draft.trim().length < 2}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <SafeText className="mt-1.5">{comment.content}</SafeText>
      )}

      {comment.moderationStatus === "pending" ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Awaiting review — only you can see this.
        </p>
      ) : null}

      {!editing ? (
        <div className="mt-2 -ml-1.5 flex items-center gap-1">
          <HelpfulButton
            targetId={comment.id}
            kind="comment"
            variant="comment"
            initialCount={comment.helpfulCount}
            initialActive={comment.hasVoted}
            isAuthenticated={Boolean(user)}
          />

          <button
            type="button"
            onClick={() => setReplying((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <CornerDownRight className="size-3.5" />
            Reply
          </button>
        </div>
      ) : null}

      {replying ? (
        <CommentForm
          problemId={problemId}
          solutionId={solutionId}
          parentId={comment.id}
          user={user}
          compact
          autoFocus
          placeholder={
            comment.author ? `Reply to @${comment.author.username}…` : "Reply…"
          }
          onPosted={() => setReplying(false)}
          onCancel={() => setReplying(false)}
          className="mt-3"
        />
      ) : null}

      {comment.replies.length > 0 ? (
        <div className="mt-2 space-y-0 border-l border-hairline pl-4 sm:pl-5">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              user={user}
              problemId={problemId}
              solutionId={solutionId}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
            <AlertDialogDescription>
              Replies to it stay visible so the thread still makes sense.
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
        targetType="comment"
        targetId={comment.id}
        targetLabel="comment"
      />
    </div>
  );
}
