"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { toggleSolutionHelpful } from "@/actions/votes";
import { goToSignIn } from "@/lib/auth/sign-in-redirect";
import { cn } from "@/lib/utils";

/** "Helpful" toggle for solutions. Optimistic, then reconciled against the
 * count the server actually stored. */
export function HelpfulButton({
  targetId,
  initialCount,
  initialActive,
  isAuthenticated,
  className,
}: {
  targetId: string;
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
      const result = await toggleSolutionHelpful(targetId);

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
      Helpful
    </button>
  );
}
