"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/actions/notifications";
import { notificationCopy } from "@/lib/constants";
import { timeAgo } from "@/lib/utils/time";
import { cn } from "@/lib/utils";
import type { NotificationDTO } from "@/types";

const SYSTEM_TYPES = new Set(["content_removed","content_approved","category_approved",
]);

export function NotificationList({
  notifications,
  unreadCount,
}: {
  notifications: NotificationDTO[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function markAll() {
    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      {unreadCount > 0 ? (
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="num text-sm text-muted-foreground">
            {unreadCount} unread
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={markAll}
            disabled={pending}
          >
            <CheckCheck className="size-3.5" />
            {pending ? "Marking…" : "Mark all as read"}
          </Button>
        </div>
      ) : null}

      <ul className="divide-y divide-hairline rounded-xl border border-hairline bg-elevated">
        {notifications.map((notification) => {
          const isSystem = SYSTEM_TYPES.has(notification.type);

          return (
            <li key={notification.id}>
              <Link
                href={notification.href}
                onClick={() => {
                  if (!notification.read) {
                    startTransition(async () => {
                      await markNotificationRead(notification.id);
                    });
                  }
                }}
                className={cn("flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40",
                  !notification.read && "bg-brand-muted/25"
                )}
              >
                <span className="relative mt-0.5 shrink-0">
                  {notification.actor ? (
                    <UserAvatar
                      name={notification.actor.name}
                      username={notification.actor.username}
                      avatar={notification.actor.avatar}
                      size="md"
                    />
                  ) : (
                    <span className="flex size-8 items-center justify-center rounded-full bg-sunken text-xs font-semibold text-brand">
                      pl
                    </span>
                  )}
                  {!notification.read ? (
                    <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-brand ring-2 ring-elevated" />
                  ) : null}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm leading-snug text-foreground">
                    {isSystem ? (
                      notification.message ?? notificationCopy(notification.type)
                    ) : (
                      <>
                        <span className="font-medium">
                          {notification.actor
                            ? `@${notification.actor.username}`
                            : "Someone"}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {notificationCopy(notification.type)}
                        </span>
                      </>
                    )}
                  </span>

                  {notification.problem ? (
                    <span className="mt-0.5 block truncate text-sm font-medium text-foreground/70">
                      {notification.problem.title}
                    </span>
                  ) : null}

                  <span className="mt-1 block text-xs text-muted-foreground">
                    {timeAgo(notification.createdAt)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
