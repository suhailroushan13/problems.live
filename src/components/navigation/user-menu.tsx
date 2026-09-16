"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  Bell,
  Bookmark,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  Ticket,
  UserPlus,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { UserAvatar } from "@/components/shared/user-avatar";
import { signOut } from "@/actions/auth";
import { formatCount } from "@/lib/utils/format";
import type { SessionUser } from "@/lib/auth/current-user";

export function UserMenu({
  user,
  unreadCount,
}: {
  user: Pick<
    SessionUser,
    "name" | "username" | "avatar" | "reputation" | "isAdmin" | "problemCredits"
  >;
  unreadCount: number;
}) {
  const [pending, startTransition] = useTransition();

  async function handleInvite() {
    const url = window.location.origin;
    const shareData = {
      title: "problems.live",
      text: "A public directory of problems people face, share, and want solved, come add yours.",
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") {
          toast.error("Couldn't open the share sheet.");
        }
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied.");
    } catch {
      toast.error("Couldn't copy the link.");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-10 rounded-full p-0 ring-1 ring-transparent transition-shadow hover:ring-hairline"
          aria-label="Account menu"
        >
          <UserAvatar
            name={user.name}
            username={user.username}
            avatar={user.avatar}
            size="md"
          />
          <span
            className="absolute bottom-0 left-0 size-2.5 rounded-full bg-success ring-2 ring-background"
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-72 p-1.5">
        <DropdownMenuLabel className="p-0 font-normal">
          <Link
            href={`/u/${user.username}`}
            className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted"
          >
            <UserAvatar
              name={user.name}
              username={user.username}
              avatar={user.avatar}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-foreground">
                  {user.name}
                </span>
                {user.isAdmin ? (
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                    Admin
                  </Badge>
                ) : null}
              </div>
              <span className="truncate text-xs text-muted-foreground">
                @{user.username}
              </span>
            </div>
          </Link>
        </DropdownMenuLabel>

        <div className="my-1.5 grid grid-cols-2 gap-1.5 px-2">
          <Link
            href="/reputation"
            className="flex flex-col gap-0.5 rounded-lg bg-sunken px-2.5 py-2 transition-colors hover:bg-muted"
          >
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Sparkles className="size-3" /> Reputation
            </span>
            <span className="num text-sm font-semibold text-foreground">
              {formatCount(user.reputation)}
            </span>
          </Link>
          <Link
            href="/credits"
            className="flex flex-col gap-0.5 rounded-lg bg-sunken px-2.5 py-2 transition-colors hover:bg-muted"
          >
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Ticket className="size-3" /> Credits
            </span>
            <span className="num text-sm font-semibold text-foreground">
              {formatCount(user.problemCredits)}
            </span>
          </Link>
        </div>

        <DropdownMenuSeparator className="my-1.5" />

        <DropdownMenuGroup className="flex flex-col gap-0.5">
          <DropdownMenuItem asChild className="px-2 py-2">
            <Link href={`/u/${user.username}`}>
              <UserRound className="size-4" /> Your profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="px-2 py-2">
            <Link href="/bookmarks">
              <Bookmark className="size-4" /> Saved problems
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="px-2 py-2">
            <Link href="/notifications">
              <Bell className="size-4" /> Notifications
              {unreadCount > 0 ? (
                <span className="num ml-auto rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-brand-foreground">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="px-2 py-2">
            <Link href="/settings">
              <Settings className="size-4" /> Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="px-2 py-2"
            onSelect={() => {
              void handleInvite();
            }}
          >
            <UserPlus className="size-4" /> Invite a friend
          </DropdownMenuItem>

          <div className="flex items-center justify-between rounded-md px-2 py-2 text-sm">
            <span className="text-foreground">Dark mode</span>
            <AnimatedThemeToggler
              className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/25 [&_svg]:size-4"
              aria-label="Toggle dark mode"
            />
          </div>
        </DropdownMenuGroup>

        {user.isAdmin ? (
          <>
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuItem asChild className="px-2 py-2">
              <Link href="/admin">
                <LayoutDashboard className="size-4" /> Admin dashboard
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}

        <DropdownMenuSeparator className="my-1.5" />

        <DropdownMenuItem
          variant="destructive"
          disabled={pending}
          className="px-2 py-2"
          onSelect={(event) => {
            event.preventDefault();
            startTransition(() => {
              void signOut();
            });
          }}
        >
          <LogOut className="size-4" /> {pending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
