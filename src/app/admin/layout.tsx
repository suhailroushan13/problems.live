import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getAdminStats } from "@/lib/data/stats";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · problems.live" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Server-side gate. Every admin Server Action re-checks the role
  // independently — this only keeps the UI out of the wrong hands.
  if (!user) redirect("/api/auth/google?next=/admin");
  if (!user.isModerator) redirect("/");

  const stats = await getAdminStats();

  return (
    <div className="flex min-h-svh bg-background">
      <AdminNav
        isAdmin={user.isAdmin}
        pendingReports={stats.reportsPending}
        pendingModeration={stats.moderationPending}
        pendingCategories={stats.categoriesPending}
        pendingWaitlist={stats.waitlistPending}
      />

      <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <header className="mb-6"><p className="label text-brand">{user.isAdmin ? "Administration" : "Moderation"}</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Control room</h1></header>
        {children}
      </main>
    </div>
  );
}
