"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { dismissReport, removeContent, suspendUser } from "@/actions/admin";

export function ReportActions({
  reportId,
  targetType,
  targetId,
  authorId,
  authorUsername,
  canSuspend,
}: {
  reportId: string;
  targetType: "problem" | "solution" | "comment" | "user";
  targetId: string;
  authorId: string | null;
  authorUsername: string | null;
  canSuspend: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [reason, setReason] = useState("");
  const [days, setDays] = useState("7");

  function dismiss() {
    startTransition(async () => {
      const result = await dismissReport(reportId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Report dismissed.");
      router.refresh();
    });
  }

  function remove() {
    if (targetType === "user") return;
    startTransition(async () => {
      const result = await removeContent(targetType, targetId, reason);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Content removed.");
      setConfirmRemove(false);
      router.refresh();
    });
  }

  function suspend() {
    if (!authorId) return;
    startTransition(async () => {
      const result = await suspendUser(authorId, Number(days) || 7, reason);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "User suspended.");
      setConfirmSuspend(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={dismiss} disabled={pending}>
          <Check className="size-3.5" />
          Dismiss
        </Button>

        {targetType !== "user" ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setConfirmRemove(true)}
            disabled={pending}
          >
            <X className="size-3.5" />
            Remove content
          </Button>
        ) : null}

        {canSuspend && authorId ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirmSuspend(true)}
            disabled={pending}
            className="text-destructive"
          >
            <Ban className="size-3.5" />
            Suspend user
          </Button>
        ) : null}
      </div>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this {targetType}?</AlertDialogTitle>
            <AlertDialogDescription>
              All open reports on it are resolved and the author is notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value.slice(0, 200))}
            placeholder="Reason shown to the author (optional)"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} disabled={pending}>
              {pending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmSuspend} onOpenChange={setConfirmSuspend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Suspend @{authorUsername ?? "user"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They keep read access but cannot post, vote or comment until the
              suspension ends.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Input
              type="number"
              min={1}
              max={3650}
              value={days}
              onChange={(event) => setDays(event.target.value)}
              placeholder="Days"
            />
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value.slice(0, 200))}
              placeholder="Reason (optional)"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={suspend} disabled={pending}>
              {pending ? "Suspending…" : "Suspend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
