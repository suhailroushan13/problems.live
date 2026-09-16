"use client";

import Link from "next/link";
import { Bell, Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { LivePill } from "./live-pill";
import { UserMenu } from "./user-menu";
import type { SessionUser } from "@/lib/auth/current-user";

/** No visible container — a comfortable hit area, not a decorative circle. */
const ICON_BUTTON_CLASS =
  "relative inline-flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/25 [&_svg]:size-[1.125rem]";

export function SiteHeader({
  user,
  unreadCount,
}: {
  user: SessionUser | null;
  unreadCount: number;
}) {
  const pathname = usePathname();
  const isPosting = pathname === "/problems/new";
  const isAuthenticating = pathname === "/login";
  const postHref = user ? "/problems/new" : "/login?next=%2F";

  if (isPosting) {
    return (
      <header className="sticky top-0 z-50 border-b border-hairline bg-background/95 backdrop-blur-md">
        <div className="flex h-15 items-center gap-4 px-4 sm:h-16 sm:px-6 lg:px-8">
          <Logo />
          <Link
            href="/problems"
            className="ml-auto text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back to problems
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="flex h-14 items-center px-4 sm:h-16 sm:px-6 lg:px-8">
        <Logo compact className="tap shrink-0" />

        <div className="ml-auto flex items-center gap-1 sm:gap-6">
          <LivePill className="hidden md:inline-flex" />
          {!isAuthenticating ? <Button asChild className="hidden shrink-0 gap-1.5 sm:inline-flex">
            <Link href={postHref} title="Post a problem">
              <Plus className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Post a problem</span>
              <span className="sr-only sm:not-sr-only sm:hidden">
                Post a problem
              </span>
            </Link>
          </Button> : null}

          {user ? (
            <div className="flex items-center gap-1">
              <Link
                href="/notifications"
                aria-label={
                  unreadCount > 0
                    ? `Notifications, ${unreadCount} unread`
                    : "Notifications"
                }
                className={ICON_BUTTON_CLASS}
              >
                <Bell strokeWidth={1.8} aria-hidden="true" />
                {unreadCount > 0 ? (
                  <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-brand ring-2 ring-background" />
                ) : null}
              </Link>

              <UserMenu user={user} unreadCount={unreadCount} />
            </div>
          ) : null}

          {!isAuthenticating ? <Button
            asChild
            size="icon"
            className="size-10 shrink-0 rounded-md sm:hidden"
          >
            <Link href={postHref} aria-label="Post a problem">
              <Plus className="size-4" aria-hidden="true" />
            </Link>
          </Button> : null}
        </div>
      </div>
    </header>
  );
}
