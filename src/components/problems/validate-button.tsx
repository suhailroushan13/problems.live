"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { toggleProblemValidation } from "@/actions/votes";
import { goToSignIn } from "@/lib/auth/sign-in-redirect";
import { formatCount } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

/**
 * "I have this too" — the product's central interaction.
 *
 * The count moves optimistically so the click feels instant, then is replaced
 * by the number the server actually persisted. Client state is never
 * authoritative; on failure it rolls back and says why.
 */
function useValidation(
  problemId: string,
  initialCount: number,
  initialActive: boolean,
  isAuthenticated: boolean
) {
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
      const result = await toggleProblemValidation(problemId);
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

  return { count, active, pending, toggle };
}

export function ValidateButton({
  problemId,
  initialCount,
  initialActive,
  isAuthenticated,
  className,
}: {
  problemId: string;
  initialCount: number;
  initialActive: boolean;
  isAuthenticated: boolean;
  className?: string;
}) {
  const { active, pending, toggle } = useValidation(
    problemId,
    initialCount,
    initialActive,
    isAuthenticated
  );

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={active}
      className={cn(
        "pill tap inline-flex h-11 items-center justify-center gap-2 border px-5 text-sm font-bold whitespace-nowrap transition-colors disabled:opacity-60",
        active
          ? "border-brand bg-brand text-brand-foreground"
          : "border-transparent bg-elevated text-foreground hover:bg-brand hover:text-brand-foreground",
        className
      )}
    >
      {active ? <Check className="size-4" aria-hidden="true" /> : null}
      {active ? "You have this" : "I have this too"}
    </button>
  );
}

/**
 * The problem page's primary action: the count stated in plain words, with the
 * button immediately beneath it.
 */
export function ValidationPanel({
  problemId,
  initialCount,
  initialActive,
  isAuthenticated,
}: {
  problemId: string;
  initialCount: number;
  initialActive: boolean;
  isAuthenticated: boolean;
}) {
  const { count, active, pending, toggle } = useValidation(
    problemId,
    initialCount,
    initialActive,
    isAuthenticated
  );

  return (
    <div className="rounded-3xl bg-tint px-6 py-7 sm:px-8">
      <p className="text-2xl leading-tight font-extrabold tracking-[-0.025em] text-foreground sm:text-[1.875rem]">
        <span className="num text-brand">{formatCount(count)}</span>{" "}
        <span className="font-semibold text-muted-foreground">
          {count === 1 ? "person has this problem" : "people have this problem"}
        </span>
      </p>

      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={active}
        className={cn(
          "pill mt-5 inline-flex h-13 w-full items-center justify-center gap-2 border px-8 text-[0.9375rem] font-bold transition-colors disabled:opacity-60 sm:w-auto",
          active
            ? "border-brand-border bg-brand-muted text-brand"
            : "border-transparent bg-brand text-brand-foreground hover:bg-brand/90"
        )}
      >
        {active ? (
          <Check className="size-[1.125rem]" aria-hidden="true" />
        ) : (
          <Plus className="size-[1.125rem]" aria-hidden="true" />
        )}
        {active ? "You have this too" : "I have this too"}
      </button>

      {active ? (
        <p className="mt-3 text-[0.8125rem] text-muted-foreground">
          Thanks — you’ll be notified when someone proposes a solution. Click
          again to undo.
        </p>
      ) : null}
    </div>
  );
}
