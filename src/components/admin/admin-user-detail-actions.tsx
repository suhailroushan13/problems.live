"use client";

import { useRouter } from "next/navigation";
import { UserActions } from "@/components/admin/user-actions";
import type { AdminUser } from "@/lib/data/admin";

/**
 * Thin client wrapper so a delete from the detail page navigates back to
 * the list instead of re-fetching a route whose user no longer exists.
 */
export function AdminUserDetailActions({
  user,
  isSelf,
}: {
  user: AdminUser;
  isSelf: boolean;
}) {
  const router = useRouter();

  return (
    <UserActions
      user={user}
      isSelf={isSelf}
      onDeleted={() => router.push("/admin/users")}
    />
  );
}
