"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { Award } from "lucide-react";
import { toast } from "sonner";
import { toggleCommentAward } from "@/actions/votes";
import { goToSignIn } from "@/lib/auth/sign-in-redirect";
import { formatCount } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

/** Free, single-tier award toggle — no currency, just a "this stood out" signal. */
export function CommentAward({
  commentId,
  initialCount,
  initialActive,
  isAuthenticated,
  className,
}: {
  commentId: string;
  initialCount: number;
  initialActive: boolean;
  isAuthenticated: boolean;
  className?: string;
}) {
  const [count, setCount] = useState(initialCount);
  const [active, setActive] = useState(initialActive);
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();

  function handleClick() {
    if (!isAuthenticated) {
      goToSignIn(pathname);
      return;
    }

    const previous = { count, active };
    setActive(!active);
    setCount((value) => Math.max(0, value + (active ? -1 : 1)));

    startTransition(async () => {
      const result = await toggleCommentAward(commentId);
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

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs transition-colors",
        active ? "text-amber-600" : "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      <Award className={cn("size-3.5", active && "fill-current")} aria-hidden="true" />
      Award
      {count > 0 ? <span className="num">{formatCount(count)}</span> : null}
    </button>
  );
}
