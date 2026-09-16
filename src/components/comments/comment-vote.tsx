"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { voteComment } from "@/actions/votes";
import { goToSignIn } from "@/lib/auth/sign-in-redirect";
import { cn } from "@/lib/utils";
import type { VoteDirection } from "@/models";

/** Unlike `formatCount`, a vote score is allowed to go negative. */
function formatScore(n: number): string {
  return new Intl.NumberFormat("en").format(Math.round(n || 0));
}

/** Up/down vote arrows for a comment — one vote per user, switchable. */
export function CommentVote({
  commentId,
  initialScore,
  initialDirection,
  isAuthenticated,
  className,
}: {
  commentId: string;
  initialScore: number;
  initialDirection: VoteDirection | null;
  isAuthenticated: boolean;
  className?: string;
}) {
  const [score, setScore] = useState(initialScore);
  const [direction, setDirection] = useState(initialDirection);
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();

  function vote(next: VoteDirection) {
    if (!isAuthenticated) {
      goToSignIn(pathname);
      return;
    }

    const previous = { score, direction };
    const wasSameDirection = direction === next;
    const delta = wasSameDirection
      ? next === "up"
        ? -1
        : 1
      : direction
        ? next === "up"
          ? 2
          : -2
        : next === "up"
          ? 1
          : -1;

    setScore((value) => value + delta);
    setDirection(wasSameDirection ? null : next);

    startTransition(async () => {
      const result = await voteComment(commentId, next);
      if (!result.ok) {
        setScore(previous.score);
        setDirection(previous.direction);
        toast.error(result.error);
        return;
      }
      setScore(result.data.score);
      setDirection(result.data.direction);
    });
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-0.5 py-0.5",
        className
      )}
    >
      <button
        type="button"
        onClick={() => vote("up")}
        disabled={pending}
        aria-pressed={direction === "up"}
        aria-label="Upvote"
        className={cn(
          "flex size-6 items-center justify-center rounded transition-colors",
          direction === "up"
            ? "text-brand"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <ChevronUp className="size-4" aria-hidden="true" />
      </button>
      <span
        className={cn(
          "num min-w-4 text-center text-[0.8125rem] font-medium",
          direction === "up" && "text-brand",
          direction === "down" && "text-destructive"
        )}
      >
        {formatScore(score)}
      </span>
      <button
        type="button"
        onClick={() => vote("down")}
        disabled={pending}
        aria-pressed={direction === "down"}
        aria-label="Downvote"
        className={cn(
          "flex size-6 items-center justify-center rounded transition-colors",
          direction === "down"
            ? "text-destructive"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <ChevronDown className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
