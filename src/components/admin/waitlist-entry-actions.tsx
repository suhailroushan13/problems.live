"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  approveWaitlistEntry,
  deleteWaitlistEntry,
  rejectWaitlistEntry,
  updateWaitlistEntry,
} from "@/actions/admin";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function WaitlistEntryActions({
  id,
  name: initialName,
  email: initialEmail,
  status,
}: {
  id: string;
  name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);

  function save() {
    startTransition(async () => {
      const result = await updateWaitlistEntry({ id, name, email });
      if (!result.ok) {
        toast.error(result.error ?? "Couldn’t update the waitlist request.");
        return;
      }
      toast.success(result.message ?? "Waitlist request updated.");
      setEditOpen(false);
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteWaitlistEntry(id);
      if (!result.ok) {
        toast.error(result.error ?? "Couldn’t delete the waitlist request.");
        return;
      }
      toast.success(result.message ?? "Waitlist request deleted.");
      setDeleteOpen(false);
      router.refresh();
    });
  }

  function approve() {
    startTransition(async () => {
      const result = await approveWaitlistEntry(id);
      if (!result.ok) {
        toast.error(result.error ?? "Couldn’t approve the waitlist request.");
        return;
      }
      toast.success(result.message ?? "Waitlist request approved.");
      router.refresh();
    });
  }

  function reject() {
    startTransition(async () => {
      const result = await rejectWaitlistEntry(id);
      if (!result.ok) {
        toast.error(result.error ?? "Couldn’t reject the waitlist request.");
        return;
      }
      toast.success(result.message ?? "Waitlist request rejected.");
      setRejectOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex justify-end gap-1">
        {status === "pending" ? (
          <>
            <Button
              size="sm"
              onClick={approve}
              className="bg-success text-success-foreground hover:bg-[#15803d]"
              disabled={pending}
            >
              Approve
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setRejectOpen(true)}
              disabled={pending}
            >
              Reject
            </Button>
          </>
        ) : null}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setEditOpen(true)}
          aria-label={`Edit ${initialName}`}
          disabled={pending}
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setDeleteOpen(true)}
          aria-label={`Delete ${initialName}`}
          disabled={pending}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit waitlist request</DialogTitle>
            <DialogDescription>Update this requester’s contact details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor={`waitlist-name-${id}`}>Name</Label>
              <Input
                id={`waitlist-name-${id}`}
                value={name}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`waitlist-email-${id}`}>Email</Label>
              <Input
                id={`waitlist-email-${id}`}
                type="email"
                value={email}
                maxLength={254}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {initialName}’s request?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {initialEmail} from the waitlist.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                remove();
              }}
            >
              {pending ? "Deleting…" : "Delete request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject {initialName}&apos;s request?</AlertDialogTitle>
            <AlertDialogDescription>
              This marks the request as rejected. No invitation will be sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                reject();
              }}
            >
              {pending ? "Rejecting…" : "Reject request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
