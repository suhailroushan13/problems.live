import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to problems.live
      </Link>

      <header className="mt-6 mb-7">
        <p className="label mb-2 text-brand">
          {user.isAdmin ? "Administration" : "Moderation"}
        </p>
        <h1 className="display text-3xl text-foreground sm:text-4xl">
          Control room
        </h1>
      </header>

      <AdminNav
        isAdmin={user.isAdmin}
        pendingReports={stats.reportsPending}
        pendingModeration={stats.moderationPending}
        pendingCategories={stats.categoriesPending}
      />

      <div className="mt-8">{children}</div>
    </div>
  );
}
