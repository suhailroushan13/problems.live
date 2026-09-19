"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { ArrowDown, ArrowUp, MessageCircle, MousePointerClick, Share2 } from "lucide-react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/shared/category-icon";
import { AnonymousAvatar, UserAvatar } from "@/components/shared/user-avatar";
import { BookmarkButton } from "./bookmark-button";
import { ProblemActions } from "./problem-actions";
import { ProblemLink } from "./problem-link";
import { StatusDot } from "./status-dot";
import { useValidation } from "./validate-button";
import { useWaitlistApproved } from "@/hooks/use-waitlist-approved";
import { formatCount } from "@/lib/utils/format";
import { timeAgo } from "@/lib/utils/time";
import { cn } from "@/lib/utils";
import type { ProblemDTO } from "@/types";

/** Compact voting control. Deliberately quiet — a supporting control, not competition for the title. */
function VoteRail({ count, active, pending, toggle, dense = false }: { count: number; active: boolean; pending: boolean; toggle: () => void; dense?: boolean }) {
  return (
    <div className={cn("tap flex shrink-0 items-center rounded-lg border border-hairline bg-sunken px-0.5 text-muted-foreground/70", dense ? "h-8 min-h-8!" : "h-9")}>
      <button type="button" onClick={() => !active && toggle()} disabled={pending} aria-label="I have this too" aria-pressed={active} className={cn("flex items-center justify-center rounded-md transition-colors disabled:opacity-60", dense ? "size-7" : "size-8", active ? "bg-brand-muted/70 text-brand" : "hover:bg-brand-muted/60 hover:text-brand sm:hover:bg-success-subtle sm:hover:text-success")}>
        <ArrowUp className="size-3.5" />
      </button>
      <span className={cn("num min-w-6 text-center text-[0.8125rem] font-semibold sm:text-sm", active ? "text-brand" : "text-foreground/80")}>{formatCount(count)}</span>
      <button type="button" onClick={() => active && toggle()} disabled={pending} aria-label="Retract, I don't have this" className={cn("flex items-center justify-center rounded-md transition-colors hover:bg-sunken hover:text-foreground sm:hover:bg-error-subtle sm:hover:text-destructive disabled:opacity-60", dense ? "size-7" : "size-8")}>
        <ArrowDown className="size-3.5" />
      </button>
    </div>
  );
}

/** A scannable problem row that makes validation, discussion and contribution explicit. */
export function ProblemCard({ problem, isAuthenticated, isModerator }: { problem: ProblemDTO; isAuthenticated: boolean; isModerator: boolean }) {
  const router = useRouter();
  const approved = useWaitlistApproved();
  const { count, active, pending, toggle } = useValidation(problem.id, problem.validationCount, problem.hasValidated, isAuthenticated);

  function recordOpen() {
    const url = `/api/problems/${problem.id}/click`;
    if (navigator.sendBeacon) navigator.sendBeacon(url);
    else void fetch(url, { method: "POST", credentials: "same-origin", keepalive: true });
  }
  /** Gate for every path into the problem: not on the waitlist → /wait-list, not signed in → /login, otherwise proceed. */
  function guardNavigation(destination: string): boolean {
    if (!approved) {
      router.push("/wait-list");
      return false;
    }
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(destination)}`);
      return false;
    }
    return true;
  }
  function openProblem() {
    const destination = `/problems/${problem.slug}`;
    if (!guardNavigation(destination)) return;
    recordOpen();
    router.push(destination);
  }
  function handleShare() {
    const url = `${window.location.origin}/problems/${problem.slug}`;
    if (navigator.share) { navigator.share({ title: problem.title, url }).catch(() => undefined); return; }
    navigator.clipboard.writeText(url).then(() => toast.success("Link copied.")).catch(() => toast.error("Couldn't copy the link."));
  }
  function handleCardNavigation(event: MouseEvent<HTMLElement>) {
    if (!(event.target as HTMLElement).closest("a, button, input, select, textarea")) openProblem();
  }

  return (
    <article role="link" tabIndex={0} onClick={handleCardNavigation} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openProblem(); } }} className="cursor-pointer rounded-xl border border-hairline bg-elevated px-4 py-3 shadow-[0_2px_6px_rgb(15_23_42/0.04)] outline-none transition-[border-color,box-shadow] duration-150 active:border-rule focus-visible:ring-3 focus-visible:ring-brand/25">
      <div className="flex flex-nowrap items-center gap-1 text-xs text-muted-foreground sm:gap-1.5 sm:text-sm">
        {problem.author ? <UserAvatar name={problem.author.name} username={problem.author.username} avatar={problem.author.avatar} size="2xs" /> : <AnonymousAvatar size="2xs" />}
        <span className="min-w-0 truncate">
          {problem.author?.name ?? "Anonymous"} <span className="mx-1" aria-hidden="true">·</span> {timeAgo(problem.createdAt)}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
          {problem.category ? (
            <Link href={`/categories/${problem.category.slug}`} onClick={(event) => event.stopPropagation()} aria-label={problem.category.name} title={problem.category.name} className="inline-flex items-center gap-1 rounded-full border border-hairline bg-tint p-1 text-[0.6875rem] font-semibold text-foreground transition-colors hover:border-brand-border hover:bg-brand-muted sm:px-2 sm:py-1 sm:text-xs">
              <CategoryIcon name={problem.category.icon} className="size-3 text-brand sm:size-3.5" />
              <span className="hidden sm:inline">{problem.category.name}</span>
            </Link>
          ) : null}
          <StatusDot status={problem.status} className="px-1.5 py-0.5 text-[0.6875rem] sm:px-2 sm:py-1 sm:text-xs" />
        </div>
      </div>

      <ProblemLink
        problemId={problem.id}
        slug={problem.slug}
        onClick={(event) => { if (!guardNavigation(`/problems/${problem.slug}`)) event.preventDefault(); }}
        className="mt-1.5 block text-[0.9375rem] leading-[1.3] font-bold tracking-[-0.01em] text-foreground transition-colors hover:text-brand sm:text-lg"
      >
        {problem.title}
      </ProblemLink>
      {problem.excerpt ? <p className="mt-1 line-clamp-1 text-[0.8125rem] text-muted-foreground/70 sm:text-base">{problem.excerpt}</p> : null}

      <div className="mt-3 flex items-center gap-2 text-[0.8125rem] font-semibold text-muted-foreground sm:text-sm">
        <VoteRail count={count} active={active} pending={pending} toggle={toggle} dense />
        <Link
          href={`/problems/${problem.slug}#discussion`}
          onClick={(event) => {
            if (!guardNavigation(`/problems/${problem.slug}#discussion`)) { event.preventDefault(); return; }
            recordOpen();
          }}
          aria-label={`${formatCount(problem.commentCount)} comments`}
          title="Comments"
          className="tap flex h-8 min-h-8! shrink-0 items-center gap-1 rounded-lg border border-hairline bg-sunken px-2 transition-colors hover:bg-background hover:text-foreground"
        >
          <MessageCircle className="size-3.5" aria-hidden="true" />
          {formatCount(problem.commentCount)}
        </Link>
        <BookmarkButton
          problemId={problem.id}
          initialCount={problem.bookmarkCount}
          initialActive={problem.hasBookmarked}
          isAuthenticated={isAuthenticated}
          showCount={false}
          className="size-8 min-h-8! shrink-0 rounded-lg border border-hairline bg-sunken hover:bg-background"
        />
        <button type="button" onClick={handleShare} aria-label="Share problem" title="Share" className="tap flex size-8 min-h-8! shrink-0 items-center justify-center rounded-lg border border-hairline bg-sunken transition-colors hover:bg-background hover:text-foreground">
          <Share2 className="size-3.5" />
        </button>
        <span title={`${formatCount(problem.clickCount)} ${problem.clickCount === 1 ? "click" : "clicks"}`} className="num sm:hidden flex h-8 min-h-8! shrink-0 items-center gap-1 rounded-lg border border-hairline bg-sunken px-2 text-muted-foreground/70">
          <MousePointerClick className="size-3.5" aria-hidden="true" />
          {formatCount(problem.clickCount)}
        </span>
        <ProblemActions
          problemId={problem.id}
          slug={problem.slug}
          status={problem.status}
          isOwn={problem.isOwn}
          isModerator={isModerator}
          isAuthenticated={isAuthenticated}
          triggerClassName="sm:hidden size-8 min-h-8! shrink-0 rounded-lg border border-hairline bg-sunken text-muted-foreground/70 hover:bg-background hover:text-foreground"
        />
        <span title={`${formatCount(problem.clickCount)} ${problem.clickCount === 1 ? "click" : "clicks"}`} className="num hidden sm:flex h-8 min-h-8! shrink-0 items-center gap-1 rounded-lg border border-hairline bg-sunken px-2 text-muted-foreground/70">
          <MousePointerClick className="size-3.5" aria-hidden="true" />
          {formatCount(problem.clickCount)}
        </span>
        <ProblemActions
          problemId={problem.id}
          slug={problem.slug}
          status={problem.status}
          isOwn={problem.isOwn}
          isModerator={isModerator}
          isAuthenticated={isAuthenticated}
          variant="report"
          triggerClassName="hidden sm:flex size-8 min-h-8! shrink-0 rounded-lg border border-hairline bg-sunken text-muted-foreground/70 hover:bg-background hover:text-foreground"
        />
      </div>
    </article>
  );
}
