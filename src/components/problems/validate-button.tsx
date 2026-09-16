"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, Heart, Lightbulb, MessageCircle, Share2, Users } from "lucide-react";
import { toast } from "sonner";
import { toggleProblemValidation } from "@/actions/votes";
import { goToSignIn } from "@/lib/auth/sign-in-redirect";
import { BookmarkButton } from "./bookmark-button";
import { formatCount } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

/**
 * "I have this too" — the product's central interaction.
 *
 * The count moves optimistically so the click feels instant, then is replaced
 * by the number the server actually persisted. Client state is never
 * authoritative; on failure it rolls back and says why.
 */
export function useValidation(
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
        "pill tap inline-flex h-11 items-center justify-center gap-2 border px-5 text-sm font-semibold whitespace-nowrap transition-colors disabled:opacity-60",
        active
          ? "border-brand bg-brand text-brand-foreground"
          : "border-border bg-elevated text-foreground hover:border-brand hover:bg-brand hover:text-brand-foreground",
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
  commentCount,
  bookmarkCount,
  hasBookmarked,
}: {
  problemId: string;
  initialCount: number;
  initialActive: boolean;
  isAuthenticated: boolean;
  commentCount: number;
  bookmarkCount: number;
  hasBookmarked: boolean;
}) {
  const { count, active, pending, toggle } = useValidation(
    problemId,
    initialCount,
    initialActive,
    isAuthenticated
  );

  async function share() {
    const data = { title: document.title, url: window.location.href };
    if (navigator.share) {
      try { await navigator.share(data); } catch { /* Closing the sheet is expected. */ }
      return;
    }
    try { await navigator.clipboard.writeText(window.location.href); toast.success("Link copied."); }
    catch { toast.error("Couldn’t copy the link."); }
  }

  return (
    <div className="mt-8 flex flex-wrap items-center gap-2 border-y border-hairline py-3 sm:mt-10">
      <span className="inline-flex h-10 items-center gap-1.5 rounded-md border border-hairline px-3 text-sm font-medium text-muted-foreground">
        <Users className="size-4" aria-hidden="true" />
        <span className="num text-foreground">{formatCount(count)}</span>
        <span className="hidden min-[390px]:inline">{count === 1 ? "person relates" : "people relate"}</span>
      </span>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={active}
        className={cn(
          "tap inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors disabled:opacity-60",
          active ? "bg-brand-muted text-brand" : "bg-brand text-brand-foreground hover:bg-brand-hover active:bg-brand-active"
        )}
      >
        {active ? <Check className="size-4" aria-hidden="true" /> : <Heart className="size-4" aria-hidden="true" />}
        {active ? "You relate" : "I relate"}
      </button>
      <Link href="#discussion" className="tap inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground">
        <MessageCircle className="size-4" aria-hidden="true" />
        <span className="num">{formatCount(commentCount)}</span><span className="hidden sm:inline">comments</span>
      </Link>
      <button type="button" onClick={() => void share()} className="tap ml-auto inline-flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground" aria-label="Share problem">
        <Share2 className="size-[1.125rem]" aria-hidden="true" />
      </button>
      <BookmarkButton
        problemId={problemId}
        initialCount={bookmarkCount}
        initialActive={hasBookmarked}
        isAuthenticated={isAuthenticated}
        className="size-10 rounded-md"
        iconClassName="size-4"
        showCount={false}
      />
    </div>
  );
}

/**
 * The compact mobile counterpart to the desktop signal panel. It keeps the
 * post's core interactions in one familiar, thumb-reachable row.
 */
export function MobileProblemActions({
  problemId,
  initialCount,
  initialActive,
  isAuthenticated,
  solutionCount,
}: {
  problemId: string;
  initialCount: number;
  initialActive: boolean;
  isAuthenticated: boolean;
  solutionCount: number;
}) {
  const { count, active, pending, toggle } = useValidation(
    problemId,
    initialCount,
    initialActive,
    isAuthenticated
  );

  async function share() {
    const data = { title: document.title, url: window.location.href };

    if (navigator.share) {
      try {
        await navigator.share(data);
      } catch {
        // Closing the native share sheet is an expected outcome.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied.");
    } catch {
      toast.error("Couldn’t copy the link.");
    }
  }

  return (
    <div className="mt-6 flex items-center justify-between gap-2 border-y border-hairline py-3.5 sm:hidden">
      <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Users className="size-4 shrink-0" aria-hidden="true" />
        <span className="num">{formatCount(count)}</span>
        <span className="hidden min-[360px]:inline">
          {count === 1 ? "person relates" : "people relate"}
        </span>
      </span>

      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={active}
        className={cn(
          "tap inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors disabled:opacity-60",
          active
            ? "bg-brand-muted text-brand"
            : "bg-brand text-brand-foreground active:bg-brand-active"
        )}
      >
        {active ? <Check className="size-4" aria-hidden="true" /> : <Heart className="size-4" aria-hidden="true" />}
        <span>{active ? "Related" : "I relate"}</span>
      </button>

      <Link
        href="#solutions"
        className="tap inline-flex h-10 shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <Lightbulb className="size-4" aria-hidden="true" />
        <span className="num">{formatCount(solutionCount)}</span>
        <span className="sr-only">solutions</span>
      </Link>

      <button
        type="button"
        onClick={() => void share()}
        aria-label="Share problem"
        className="tap inline-flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground"
      >
        <Share2 className="size-[1.125rem]" aria-hidden="true" />
      </button>
    </div>
  );
}
