"use client";

import { Bookmark } from "lucide-react";
import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { toggleProblemBookmark } from "@/actions/votes";
import { goToSignIn } from "@/lib/auth/sign-in-redirect";
import { formatCount } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

/** Private save control; its count is public but its active state is not. */
export function BookmarkButton({
  problemId,
  initialCount,
  initialActive,
  isAuthenticated,
  className,
  iconClassName,
  showCount = true,
  menuItem = false,
}: {
  problemId: string;
  initialCount: number;
  initialActive: boolean;
  isAuthenticated: boolean;
  className?: string;
  iconClassName?: string;
  showCount?: boolean;
  menuItem?: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [active, setActive] = useState(initialActive);
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();

  function toggle() {
    if (!isAuthenticated) {
      goToSignIn(pathname);
      return;
    }

    const previous = { count, active };
    setActive(!active);
    setCount((value) => Math.max(0, value + (active ? -1 : 1)));

    startTransition(async () => {
      const result = await toggleProblemBookmark(problemId);
      if (!result.ok) {
        setCount(previous.count);
        setActive(previous.active);
        toast.error(result.error);
        return;
      }
      setCount(result.data.count);
      setActive(result.data.active);
    });
  }

  if (menuItem) {
    return (
      <DropdownMenuItem
        disabled={pending}
        onSelect={(event) => {
          event.preventDefault();
          toggle();
        }}
      >
        <Bookmark className="size-4" fill={active ? "currentColor" : "none"} />
        {active ? "Remove bookmark" : "Bookmark"}
      </DropdownMenuItem>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={`${active ? "Remove bookmark" : "Bookmark problem"}, ${formatCount(count)} ${count === 1 ? "bookmark" : "bookmarks"}`}
      aria-pressed={active}
      title={active ? "Saved privately" : "Save privately"}
      className={cn(
        "tap inline-flex items-center justify-center gap-1 rounded-full text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground disabled:opacity-60",
        active && "bg-brand-muted text-brand hover:bg-brand-muted hover:text-brand",
        className
      )}
    >
      <Bookmark
        className={cn("size-3.5", iconClassName)}
        fill={active ? "currentColor" : "none"}
        aria-hidden="true"
      />
      {showCount ? <span className="num text-xs">{formatCount(count)}</span> : null}
    </button>
  );
}
