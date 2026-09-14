"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, MoreHorizontal, ShieldCheck, UserCheck } from "lucide-react";
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
import { setUserRole, suspendUser, unsuspendUser } from "@/actions/admin";
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
  const [days, setDays] = useState("7");
  const [reason, setReason] = useState("");

  function run(action: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "That didn't work.");
        return;
      }
      toast.success(result.message ?? "Done.");
      setConfirmSuspend(false);
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
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Role
          </DropdownMenuLabel>
          {(["user", "moderator", "admin"] as const)
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
        </DropdownMenuContent>
      </DropdownMenu>

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
    </>
  );
}
