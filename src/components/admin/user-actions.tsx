"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  MoreHorizontal,
  Pencil,
  ShieldCheck,
  Trash2,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  bulkDeleteUsers,
  setUserRole,
  suspendUser,
  unsuspendUser,
  updateAdminUser,
} from "@/actions/admin";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { AdminUser } from "@/lib/data/admin";

export function UserActions({
  user,
  isSelf,
}: {
  user: AdminUser;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [days, setDays] = useState("7");
  const [reason, setReason] = useState("");
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);

  function run(action: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "That didn't work.");
        return;
      }
      toast.success(result.message ?? "Done.");
      setConfirmSuspend(false);
      setEditOpen(false);
      setDeleteOpen(false);
      router.refresh();
    });
  }

  if (isSelf) {
    return (
      <span className="text-xs text-muted-foreground italic">You</span>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for @${user.username}`}
            disabled={pending}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit profile
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Role
          </DropdownMenuLabel>
          {(["user", "admin"] as const)
            .filter((role) => role !== user.role)
            .map((role) => (
              <DropdownMenuItem
                key={role}
                onSelect={() => run(() => setUserRole(user.id, role))}
              >
                <ShieldCheck className="size-4" />
                Make {role}
              </DropdownMenuItem>
            ))}

          <DropdownMenuSeparator />

          {user.status === "suspended" ? (
            <DropdownMenuItem
              onSelect={() => run(() => unsuspendUser(user.id))}
            >
              <UserCheck className="size-4" />
              Reinstate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setConfirmSuspend(true)}
            >
              <Ban className="size-4" />
              Suspend
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete from database
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit @{user.username}</DialogTitle>
            <DialogDescription>
              Update the public profile details. Their sign-in email is managed by Google.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor={`user-name-${user.id}`}>Name</Label>
              <Input
                id={`user-name-${user.id}`}
                value={name}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`user-username-${user.id}`}>Username</Label>
              <Input
                id={`user-username-${user.id}`}
                value={username}
                maxLength={30}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`user-email-${user.id}`}>Email</Label>
              <Input id={`user-email-${user.id}`} value={user.email} disabled />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => run(() => updateAdminUser(user.id, { name, username }))}
              disabled={pending}
            >
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmSuspend} onOpenChange={setConfirmSuspend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend @{user.username}?</AlertDialogTitle>
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
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                run(() => suspendUser(user.id, Number(days) || 7, reason));
              }}
            >
              {pending ? "Suspending…" : "Suspend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete @{user.username} from the database?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes their account, profile, problems, solutions, comments,
              votes, bookmarks and related records. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                run(() => bulkDeleteUsers([user.id]));
              }}
            >
              {pending ? "Deleting…" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
