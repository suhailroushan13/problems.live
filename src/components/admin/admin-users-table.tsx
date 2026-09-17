"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
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
import { formatDate } from "@/lib/utils/time";

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
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  disabled={selectableIds.length === 0}
                  aria-label="Select all deletable users"
                />
              </TableHead>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-right">Problems</TableHead>
              <TableHead className="text-right">Solutions</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isSelf = user.id === viewerId;
              const isProtected = isSelf || user.role === "admin";

              return (
                <TableRow key={user.id}>
                  <TableCell>
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
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <UserAvatar
                        name={user.name}
                        username={user.username}
                        avatar={user.avatar}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/u/${user.username}`}
                          className="block truncate text-sm font-medium text-foreground transition-colors hover:text-brand"
                        >
                          {user.name}
                        </Link>
                        <span className="block truncate text-xs text-muted-foreground">
                          @{user.username}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant={user.role === "user" ? "outline" : "secondary"}
                        className="capitalize"
                      >
                        {user.role}
                      </Badge>
                      {user.status === "suspended" ? (
                        <Badge variant="destructive">Suspended</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="num text-right">
                    {formatCount(user.reputation)}
                  </TableCell>
                  <TableCell className="num text-right">
                    {formatCount(user.problems)}
                  </TableCell>
                  <TableCell className="num text-right">
                    {formatCount(user.solutions)}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell>
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
