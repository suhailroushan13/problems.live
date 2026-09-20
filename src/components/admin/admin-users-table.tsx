"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { UserAvatar } from "@/components/shared/user-avatar";
import { UserActions } from "@/components/admin/user-actions";
import { bulkDeleteUsers } from "@/actions/admin";
import type { AdminUser } from "@/lib/data/admin";
import { formatCount } from "@/lib/utils/format";
import { formatDate, formatDateTimeWithSeconds } from "@/lib/utils/time";
import { cn } from "@/lib/utils";

/** Right-aligned stat cell. Zero reads as neutral, not an error state. */
function StatValue({ value }: { value: number }) {
  return (
    <span className={cn("num text-sm font-semibold", value === 0 ? "text-muted-foreground/50" : "text-foreground")}>
      {formatCount(value)}
    </span>
  );
}

export function AdminUsersTable({
  users,
  viewerId,
}: {
  users: AdminUser[];
  viewerId: string | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const selectableIds = useMemo(
    () =>
      users
        .filter((user) => user.id !== viewerId && user.role !== "admin")
        .map((user) => user.id),
    [users, viewerId]
  );
  const allSelected =
    selectableIds.length > 0 && selected.size === selectableIds.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectableIds));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function confirmDelete() {
    const ids = Array.from(selected);
    startTransition(async () => {
      const result = await bulkDeleteUsers(ids);
      if (!result.ok) {
        toast.error(result.error ?? "That didn't work.");
        return;
      }
      toast.success(result.message ?? "Users deleted.");
      setSelected(new Set());
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <div>
      {selected.size > 0 ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-sunken px-4 py-2.5">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {selected.size}
            </span>{" "}
            {selected.size === 1 ? "user" : "users"} selected
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={pending}
          >
            <Trash2 className="size-3.5" />
            Delete selected
          </Button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-hairline">
        <Table>
          <TableHeader className="bg-tint">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  disabled={selectableIds.length === 0}
                  aria-label="Select all deletable users"
                />
              </TableHead>
              <TableHead className="w-10 text-center">#</TableHead>
              <TableHead className="min-w-[11rem]">Name</TableHead>
              <TableHead className="min-w-[8rem]">Username</TableHead>
              <TableHead className="min-w-[13rem]">Email</TableHead>
              <TableHead className="w-[5.5rem]">Role</TableHead>
              <TableHead className="w-20 text-right">Score</TableHead>
              <TableHead className="w-20 text-right">Problems</TableHead>
              <TableHead className="w-20 text-right">Solutions</TableHead>
              <TableHead className="w-[9.5rem]">Joined</TableHead>
              <TableHead className="w-[6.5rem] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user, index) => {
              const isSelf = user.id === viewerId;
              const isProtected = isSelf || user.role === "admin";

              return (
                <TableRow
                  key={user.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/users/${user.id}`)}
                >
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(user.id)}
                      onCheckedChange={() => toggleOne(user.id)}
                      disabled={isProtected}
                      aria-label={`Select @${user.username}`}
                      title={
                        isProtected
                          ? "Protected, can't be bulk-deleted"
                          : undefined
                      }
                    />
                  </TableCell>
                  <TableCell className="num text-center text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <UserAvatar
                        name={user.name}
                        username={user.username}
                        avatar={user.avatar}
                        size="sm"
                        className="border border-hairline"
                      />
                      <span className="block max-w-[12rem] truncate text-sm font-semibold text-foreground">
                        {user.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="block max-w-[9rem] truncate text-sm text-foreground/70">
                      @{user.username}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      title={user.email}
                      className="block max-w-[14rem] truncate text-sm text-muted-foreground"
                    >
                      {user.email}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "capitalize",
                          user.role === "admin" && "border-warning/25 bg-warning-subtle text-warning"
                        )}
                      >
                        {user.role}
                      </Badge>
                      {user.status === "suspended" ? (
                        <Badge variant="destructive">Suspended</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <StatValue value={user.reputation} />
                  </TableCell>
                  <TableCell className="text-right">
                    <StatValue value={user.problems} />
                  </TableCell>
                  <TableCell className="text-right">
                    <StatValue value={user.solutions} />
                  </TableCell>
                  <TableCell
                    title={formatDateTimeWithSeconds(user.createdAt)}
                    className="text-sm whitespace-nowrap text-muted-foreground"
                  >
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <div className="flex justify-end">
                      <UserActions user={user} isSelf={isSelf} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selected.size} {selected.size === 1 ? "user" : "users"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the selected accounts along with every
              problem, solution, and comment they authored. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
            >
              {pending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
