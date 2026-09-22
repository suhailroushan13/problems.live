"use client";

import Link from "next/link";
import { ArrowLeft, Bell, Plus } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { LivePill } from "./live-pill";
import { UserMenu } from "./user-menu";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import type { SessionUser } from "@/lib/auth/current-user";
import type { LiveVisitorStats } from "@/lib/data/stats";

/** No visible container — a comfortable hit area, not a decorative circle. */
const ICON_BUTTON_CLASS =
  "relative inline-flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/25 [&_svg]:size-[1.125rem]";

export function SiteHeader({
  user,
  unreadCount,
  liveStats,
}: {
  user: SessionUser | null;
  unreadCount: number;
  liveStats: LiveVisitorStats | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isPosting = pathname === "/problems/new";
  const isAuthenticating = pathname === "/login";
  const isMachineLanding = !user && pathname === "/" && searchParams.get("machine") === "1";
  const postHref = user ? "/problems/new" : "/api/auth/google?next=%2Fproblems%2Fnew";
  const postLabel = "Post a Problem";

  if (isMachineLanding) return null;

  if (isPosting) {
    return (
      <header className="sticky top-0 z-50 border-b border-hairline bg-background/95 backdrop-blur-md">
        <div className="flex h-15 items-center gap-4 px-4 sm:h-16 sm:px-6 lg:px-8">
          <Logo />
          <AnimatedThemeToggler
            className={cn(ICON_BUTTON_CLASS, "ml-auto hidden lg:inline-flex")}
            aria-label="Toggle dark mode"
          />
          <Link
            href="/problems"
            className="ml-auto inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-transparent px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-hairline hover:bg-sunken hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25 sm:px-3"
            aria-label="Back to problems"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span className="sm:hidden">Back</span>
            <span className="hidden sm:inline">Back to problems</span>
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="flex h-14 items-center px-4 sm:h-[3.75rem] sm:px-6 lg:px-8">
        <Logo compact className="tap shrink-0" />

        <div className="ml-auto flex items-center gap-1 sm:gap-6">
          <LivePill className="hidden md:inline-flex" initialStats={liveStats} />
          <AnimatedThemeToggler
            className={cn(ICON_BUTTON_CLASS, "hidden lg:inline-flex")}
            aria-label="Toggle dark mode"
          />
          {!isAuthenticating ? <Button asChild className="hidden shrink-0 gap-1.5 sm:inline-flex">
            <Link href={postHref} title={postLabel}>
              {user ? <Plus className="size-4" aria-hidden="true" /> : null}
              <span className="hidden sm:inline">{postLabel}</span>
              <span className="sr-only sm:not-sr-only sm:hidden">
                {postLabel}
              </span>
            </Link>
          </Button> : null}

          {user ? (
            <div className="flex items-center gap-1">
              {!isAuthenticating ? (
                <Link
                  href={postHref}
                  aria-label={postLabel}
                  title={postLabel}
                  className={cn(ICON_BUTTON_CLASS, "sm:hidden")}
                >
                  <Plus strokeWidth={1.8} aria-hidden="true" />
                </Link>
              ) : null}

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
          ) : (
            !isAuthenticating ? <Button
              asChild
              className="shrink-0 sm:hidden"
            >
              <Link href={postHref}>
                {postLabel}
              </Link>
            </Button> : null
          )}
        </div>
      </div>
    </header>
  );
}
