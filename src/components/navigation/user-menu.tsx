"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  Bell,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/shared/user-avatar";
import { signOut } from "@/actions/auth";
import { formatCount } from "@/lib/utils/format";
import type { SessionUser } from "@/lib/auth/current-user";

export function UserMenu({
  user,
  unreadCount,
}: {
  user: Pick<SessionUser, "name" | "username" | "avatar" | "reputation" | "isAdmin" | "problemCredits">;
  unreadCount: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-10 rounded-full p-0"
          aria-label="Account menu"
        >
          <UserAvatar
            name={user.name}
            username={user.username}
            avatar={user.avatar}
            size="md"
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-medium">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              @{user.username}
            </span>
          </div>
        </DropdownMenuLabel>

        <div className="mx-2 mt-1 mb-1.5 flex items-center justify-between rounded-md bg-sunken px-2.5 py-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="size-3.5" /> Reputation
          </span>
          <span className="num text-xs font-semibold text-foreground">
            {formatCount(user.reputation)}
          </span>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href={`/u/${user.username}`}>
            <UserRound className="size-4" /> Your profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/notifications">
            <Bell className="size-4" /> Notifications
            {unreadCount > 0 ? (
              <span className="num ml-auto rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-brand-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="size-4" /> Settings
          </Link>
        </DropdownMenuItem>

        {user.isAdmin ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <LayoutDashboard className="size-4" /> Admin
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          disabled={pending}
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
