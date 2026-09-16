import type { Metadata } from "next";
import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { AdminUserSearch } from "@/components/admin/admin-user-search";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listAdminUsers } from "@/lib/data/admin";

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
        <div className="mt-6">
          <AdminUsersTable users={users} viewerId={viewer?.id ?? null} />
        </div>
      )}
    </>
  );
}
