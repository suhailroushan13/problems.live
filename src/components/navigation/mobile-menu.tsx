"use client";

import Link from "next/link";
import { useState } from "react";
import { Compass, LogIn, Menu, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { UserAvatar } from "@/components/shared/user-avatar";
import { signOut } from "@/actions/auth";
import { formatCount } from "@/lib/utils/format";
import type { SessionUser } from "@/lib/auth/current-user";

/** A one-handed mobile dock with a secondary account sheet. */
export function MobileMenu({ user }: { user: SessionUser | null }) {
  const [open, setOpen] = useState(false);

  const accountLinks = user
    ? [
        { href: `/u/${user.username}`, label: "Your profile" },
        { href: "/notifications", label: "Notifications" },
        { href: "/settings", label: "Settings" },
        ...(user.isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
      ]
    : [];

  return (
    <aside className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-background/95 px-3 pt-2 backdrop-blur-md lg:hidden [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]">
      <nav
        aria-label="Mobile navigation"
        className="mx-auto grid max-w-sm grid-cols-3 items-center gap-1"
      >
        <Link
          href="/problems"
          className="tap flex h-12 flex-col items-center justify-center gap-0.5 rounded-md text-[0.6875rem] font-semibold text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground"
        >
          <Compass className="size-[1.125rem]" aria-hidden="true" />
          Browse
        </Link>

        <Link
          href={user ? "/problems/new" : "/api/auth/google?next=%2Fproblems%2Fnew"}
          className="tap flex h-12 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-brand-hover active:bg-brand-active"
        >
          {user ? <Plus className="size-4" aria-hidden="true" /> : <LogIn className="size-4" aria-hidden="true" />}
          {user ? "Post a problem" : "Sign in with Google"}
        </Link>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              aria-label="Open menu"
              className="tap h-12 flex-col gap-0.5 rounded-md px-3 text-[0.6875rem] font-semibold text-muted-foreground"
            >
              <Menu className="size-[1.125rem]" aria-hidden="true" />
              More
            </Button>
          </SheetTrigger>

          <SheetContent side="right" className="w-[19rem] p-0">
            <SheetHeader className="px-5 pt-5 pb-3">
              <SheetTitle className="label text-muted-foreground">Menu</SheetTitle>
            </SheetHeader>

            <div className="px-3">
              <div className="flex min-h-11 items-center justify-between rounded-lg px-2.5 text-[0.9375rem] text-muted-foreground">
                Theme
                <AnimatedThemeToggler
                  className="group/button inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-sunken hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/25 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                  aria-label="Toggle theme"
                />
              </div>
            </div>

            <Separator className="my-4 bg-hairline" />

            {user ? (
              <div className="px-3">
                <div className="mb-2 flex items-center gap-3 px-2.5 py-1">
                  <UserAvatar
                    name={user.name}
                    username={user.username}
                    avatar={user.avatar}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {user.name}
                    </p>
                    <p className="num truncate text-[0.8125rem] text-muted-foreground">
                      Score {formatCount(user.reputation)}
                    </p>
                  </div>
                </div>

                {accountLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center rounded-lg px-2.5 text-[0.9375rem] text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    void signOut();
                  }}
                  className="flex min-h-11 w-full items-center rounded-lg px-2.5 text-left text-[0.9375rem] text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <p className="px-5 text-[0.8125rem] leading-relaxed text-muted-foreground">
                Sign in when you post a problem to add your voice and join the
                discussion.
              </p>
            )}
          </SheetContent>
        </Sheet>
      </nav>
    </aside>
  );
}
