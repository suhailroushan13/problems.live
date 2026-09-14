"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
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
import { approveContent, removeContent } from "@/actions/admin";

export function ModerationActions({
  targetType,
  targetId,
}: {
  targetType: "problem" | "solution" | "comment";
  targetId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [reason, setReason] = useState("");

  function approve() {
    startTransition(async () => {
      const result = await approveContent(targetType, targetId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Approved.");
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeContent(targetType, targetId, reason);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Removed.");
      setConfirmRemove(false);
      setReason("");
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={approve} disabled={pending}>
          <Check className="size-3.5" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setConfirmRemove(true)}
          disabled={pending}
        >
          <X className="size-3.5" />
          Remove
        </Button>
      </div>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this {targetType}?</AlertDialogTitle>
            <AlertDialogDescription>
              It stops being public and the author is notified. The record is
              kept so the decision can be reviewed later.
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
    </>
  );
}
