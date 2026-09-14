import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NotificationList } from "@/components/navigation/notification-list";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  countUnreadNotifications,
  listNotifications,
} from "@/lib/data/notifications";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/google?next=/notifications");

  const [notifications, unreadCount] = await Promise.all([
    listNotifications(60),
    countUnreadNotifications(),
  ]);

  return (
    <div className="page max-w-2xl py-12 sm:py-16">
      <header className="mb-8">
        <h1 className="text-[2rem] font-extrabold tracking-[-0.035em] text-foreground sm:text-[2.75rem]">
          Notifications
        </h1>
      </header>

      {notifications.length > 0 ? (
        <NotificationList
          notifications={notifications}
          unreadCount={unreadCount}
        />
      ) : (
        <EmptyState
          title="Nothing yet."
          description="When someone validates your problem, replies to you, or suggests a solution, it shows up here."
          action={{ label: "Explore problems", href: "/problems" }}
        />
      )}
    </div>
  );
}
