import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
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

const NOTIFICATION_TRIGGERS = [
  "Someone validates your problem (“I have this too”)",
  "Someone comments or replies on it",
  "Someone proposes a solution",
  "Its status changes — being solved, or solved",
  "It reaches 50, 100, or 500 people",
  "A verified company or person responds",
];

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/notifications");

  const [notifications, unreadCount] = await Promise.all([
    listNotifications(60),
    countUnreadNotifications(),
  ]);

  return (
    <div className="page py-12 sm:py-16">
      <header className="mb-8">
        <h1 className="text-[2rem] font-bold tracking-[-0.035em] text-foreground sm:text-[2.75rem]">
          Notifications
        </h1>
      </header>

      {notifications.length > 0 ? (
        <>
          <NotificationTriggers className="mb-6" />
          <NotificationList
            notifications={notifications}
            unreadCount={unreadCount}
          />
        </>
      ) : (
        <>
          <EmptyState
            title="Nothing yet."
            description="Post a problem, or get involved in one, and this is where it comes back to find you."
            action={{ label: "Explore problems", href: "/problems" }}
          />
          <NotificationTriggers className="mx-auto mt-2 max-w-lg" />
        </>
      )}
    </div>
  );
}

function NotificationTriggers({ className }: { className?: string }) {
  return (
    <section
      className={`rounded-xl border border-hairline bg-tint p-5 sm:p-6 ${className ?? ""}`}
    >
      <p className="text-sm font-semibold text-foreground">You&apos;ll hear from us when</p>
      <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {NOTIFICATION_TRIGGERS.map((trigger) => (
          <li key={trigger} className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
            <Check className="mt-1 size-3.5 shrink-0 text-brand" aria-hidden="true" />
            <span>{trigger}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm font-medium text-foreground">
        Now there&apos;s a reason to come back.
      </p>
    </section>
  );
}
