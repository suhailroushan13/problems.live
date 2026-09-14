"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { toggleSolutionHelpful, toggleCommentHelpful } from "@/actions/votes";
import { goToSignIn } from "@/lib/auth/sign-in-redirect";
import { formatCount } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

/**
 * Shared "Helpful" toggle for solutions and comments. Optimistic, then
 * reconciled against the count the server actually stored.
 */
export function HelpfulButton({
  targetId,
  kind,
  initialCount,
  initialActive,
  isAuthenticated,
  variant = "solution",
  className,
}: {
  targetId: string;
  kind: "solution" | "comment";
  initialCount: number;
  initialActive: boolean;
  isAuthenticated: boolean;
  variant?: "solution" | "comment";
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
      const result =
        kind === "solution"
          ? await toggleSolutionHelpful(targetId)
          : await toggleCommentHelpful(targetId);

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

  if (variant === "comment") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-pressed={active}
        className={cn(
          "inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-[0.8125rem] transition-colors",
          active ? "text-brand" : "text-muted-foreground hover:text-foreground",
          className
        )}
      >
        <ThumbsUp
          className={cn("size-3.5", active && "fill-current")}
          aria-hidden="true"
        />
        <span className="num">{formatCount(count)}</span>
        <span className="sr-only">
          {active ? "Marked helpful" : "Mark as helpful"}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={active}
      className={cn(
        "pill tap inline-flex h-11 items-center justify-center gap-2 border px-5 text-sm font-bold transition-colors disabled:opacity-60",
        active
          ? "border-brand bg-brand text-brand-foreground"
          : "border-hairline bg-elevated text-foreground hover:border-brand-border hover:text-brand",
        className
      )}
    >
      <ThumbsUp
        className={cn("size-4", active && "fill-current")}
        aria-hidden="true"
      />
      {active ? "Helpful" : "Helpful"}
    </button>
  );
}
