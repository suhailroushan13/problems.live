import Link from "next/link";
import { Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";
import { SearchCommand } from "./search-command";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { MobileMenu } from "./mobile-menu";
import { LivePill } from "./live-pill";
import { SignInButton } from "@/components/shared/sign-in-button";
import type { SessionUser } from "@/lib/auth/current-user";
import type { PlatformStats } from "@/lib/data/stats";

export function SiteHeader({
  user,
  unreadCount,
  stats,
}: {
  user: SessionUser | null;
  unreadCount: number;
  stats: PlatformStats;
}) {
  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md">
      <div className="page flex h-16 items-center gap-3 sm:h-18 sm:gap-4">
        <Logo className="tap" />

        <LivePill stats={stats} className="hidden xl:inline-flex" />

        <div className="ml-auto flex items-center gap-1">
          <NavLinks className="hidden lg:flex" />

          <SearchCommand />

          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          <Button
            asChild
            size="lg"
            className="tap pill ml-1 h-10 gap-1.5 px-4 text-sm font-bold"
          >
            <Link href="/problems/new">
              <Plus className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Share problem</span>
              <span className="sm:hidden">Share</span>
            </Link>
          </Button>

          {user ? (
            <>
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label={
                  unreadCount > 0
                    ? `Notifications, ${unreadCount} unread`
                    : "Notifications"
                }
                className="relative hidden size-10 rounded-full text-muted-foreground lg:inline-flex"
              >
                <Link href="/notifications">
                  <Bell className="size-[1.125rem]" />
                  {unreadCount > 0 ? (
                    <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-brand ring-2 ring-background" />
                  ) : null}
                </Link>
              </Button>

              <div className="hidden lg:block">
                <UserMenu user={user} unreadCount={unreadCount} />
              </div>
            </>
          ) : (
            <SignInButton
              variant="ghost"
              size="lg"
              showIcon={false}
              className="tap pill hidden h-10 px-3 text-sm font-semibold lg:inline-flex"
            >
              Sign in
            </SignInButton>
          )}

          <MobileMenu user={user} />
        </div>
      </div>
    </header>
  );
}
