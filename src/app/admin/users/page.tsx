import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserAvatar } from "@/components/shared/user-avatar";
import { UserActions } from "@/components/admin/user-actions";
import { AdminUserSearch } from "@/components/admin/admin-user-search";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listAdminUsers } from "@/lib/data/admin";
import { formatCount } from "@/lib/utils/format";
import { formatDate } from "@/lib/utils/time";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const search = typeof query.q === "string" ? query.q : undefined;

  const [viewer, users] = await Promise.all([
    getCurrentUser(),
    listAdminUsers(search),
  ]);

  return (
    <>
      <AdminUserSearch defaultValue={search ?? ""} />

      {users.length === 0 ? (
        <EmptyState
          title={search ? `No users match “${search}”.` : "No users yet."}
          description="Accounts are created the first time someone signs in with Google."
          className="mt-6"
        />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-hairline">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Rep</TableHead>
                <TableHead className="text-right">Problems</TableHead>
                <TableHead className="text-right">Solutions</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
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
                      <UserActions user={user} isSelf={viewer?.id === user.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
