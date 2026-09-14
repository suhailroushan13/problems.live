"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/shared/user-avatar";
import { NAV_LINKS } from "./nav-links";
import { signOut } from "@/actions/auth";
import { formatCount } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth/current-user";

/**
 * Secondary navigation on small screens. Everything that is not the logo,
 * search or the primary action lives behind this one control.
 */
export function MobileMenu({ user }: { user: SessionUser | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const accountLinks = user
    ? [
        { href: `/u/${user.username}`, label: "Your profile" },
        { href: "/notifications", label: "Notifications" },
        { href: "/settings", label: "Settings" },
        ...(user.isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
      ]
    : [];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          className="size-10 rounded-full text-muted-foreground lg:hidden"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[19rem] p-0">
        <SheetHeader className="px-5 pt-5 pb-3">
          <SheetTitle className="label text-muted-foreground">Menu</SheetTitle>
        </SheetHeader>

        <nav className="px-3">
          {NAV_LINKS.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-lg px-2.5 text-[0.9375rem] transition-colors",
                  active
                    ? "bg-sunken font-medium text-foreground"
                    : "text-muted-foreground hover:bg-sunken hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

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
                  {formatCount(user.reputation)} reputation
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
          <div className="px-5">
            <Button asChild size="lg" className="h-11 w-full">
              <a href="/api/auth/google?next=/">Sign in with Google</a>
            </Button>
            <p className="mt-3 text-[0.8125rem] leading-relaxed text-muted-foreground">
              Signing in lets you share problems, say “I have this too”, and
              join the discussion.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
