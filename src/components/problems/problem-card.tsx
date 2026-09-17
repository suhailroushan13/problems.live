"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { ArrowDown, ArrowRight, ArrowUp, MessageCircle, Share2, Users } from "lucide-react";
import { toast } from "sonner";
import { AuthorLine } from "@/components/shared/author-line";
import { CategoryIcon } from "@/components/shared/category-icon";
import { AnonymousAvatar, UserAvatar } from "@/components/shared/user-avatar";
import { BookmarkButton } from "./bookmark-button";
import { ProblemActions } from "./problem-actions";
import { ProblemLink } from "./problem-link";
import { StatusDot } from "./status-dot";
import { useValidation } from "./validate-button";
import { formatCount } from "@/lib/utils/format";
import { timeAgo } from "@/lib/utils/time";
import { cn } from "@/lib/utils";
import type { ProblemDTO } from "@/types";

function VoteRail({ count, active, pending, toggle, compact = false }: { count: number; active: boolean; pending: boolean; toggle: () => void; compact?: boolean }) {
  return (
    <div className={cn("flex items-center text-muted-foreground", compact ? "h-10 rounded-lg border border-hairline bg-sunken px-0.5" : "flex-col gap-0.5 border-r border-hairline pr-4")}>
      <button type="button" onClick={() => !active && toggle()} disabled={pending} aria-label="I have this too" aria-pressed={active} className={cn("flex size-8 items-center justify-center rounded-md transition-colors disabled:opacity-60", active ? "bg-brand-muted text-brand" : "hover:bg-brand-muted hover:text-brand")}>
        <ArrowUp className="size-4" strokeWidth={2.5} />
      </button>
      <span className="num min-w-6 text-center text-sm font-bold text-foreground">{formatCount(count)}</span>
      <button type="button" onClick={() => active && toggle()} disabled={pending} aria-label="Retract, I don't have this" className="flex size-8 items-center justify-center rounded-md transition-colors hover:bg-sunken hover:text-foreground disabled:opacity-60">
        <ArrowDown className="size-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}

function CategoryStatus({ problem }: { problem: ProblemDTO }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {problem.category ? (
        <Link href={`/categories/${problem.category.slug}`} className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-tint px-2 py-1 text-[0.6875rem] font-semibold text-foreground transition-colors hover:border-brand-border hover:bg-brand-muted">
          <CategoryIcon name={problem.category.icon} className="size-3.5 text-brand" />
          {problem.category.name}
        </Link>
      ) : null}
      <StatusDot status={problem.status} />
    </div>
  );
}

/** A scannable problem row that makes validation, discussion and contribution explicit. */
export function ProblemCard({ problem, isAuthenticated, isModerator }: { problem: ProblemDTO; isAuthenticated: boolean; isModerator: boolean }) {
  const router = useRouter();
  const { count, active, pending, toggle } = useValidation(problem.id, problem.validationCount, problem.hasValidated, isAuthenticated);
  const isSolved = problem.status === "solved";

  function recordOpen() {
    const url = `/api/problems/${problem.id}/click`;
    if (navigator.sendBeacon) navigator.sendBeacon(url);
    else void fetch(url, { method: "POST", credentials: "same-origin", keepalive: true });
  }
  function openProblem() { recordOpen(); router.push(`/problems/${problem.slug}`); }
  function handleShare() {
    const url = `${window.location.origin}/problems/${problem.slug}`;
    if (navigator.share) { navigator.share({ title: problem.title, url }).catch(() => undefined); return; }
    navigator.clipboard.writeText(url).then(() => toast.success("Link copied.")).catch(() => toast.error("Couldn't copy the link."));
  }
  function handleCardNavigation(event: MouseEvent<HTMLElement>) {
    if (!(event.target as HTMLElement).closest("a, button, input, select, textarea")) openProblem();
  }

  const participationHref = isSolved ? `/problems/${problem.slug}#solutions` : `/problems/${problem.slug}#discussion`;
  const participationLabel = isSolved ? "View solution" : "I can help";

  return (
    <>
      <article role="link" tabIndex={0} onClick={handleCardNavigation} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openProblem(); } }} className="cursor-pointer rounded-xl border border-hairline bg-elevated px-4 py-4 shadow-[0_2px_6px_rgb(15_23_42/0.04)] outline-none transition-[border-color,box-shadow] duration-150 active:border-rule focus-visible:ring-3 focus-visible:ring-brand/25 sm:hidden">
        <ProblemLink problemId={problem.id} slug={problem.slug} className="block text-[1.25rem] leading-[1.18] font-bold tracking-[-0.025em] text-foreground transition-colors hover:text-brand">{problem.title}</ProblemLink>
        {problem.excerpt ? <p className="mt-2 line-clamp-2 text-[0.9375rem] leading-6 text-muted-foreground">{problem.excerpt}</p> : null}
        <div className="mt-3"><CategoryStatus problem={problem} /></div>
        <div className="mt-2.5 flex items-center gap-2.5 text-sm text-muted-foreground">
          {problem.author ? <UserAvatar name={problem.author.name} username={problem.author.username} avatar={problem.author.avatar} size="mobile" /> : <AnonymousAvatar size="mobile" />}
          <span>{problem.author?.name ?? "Anonymous"} <span className="mx-1" aria-hidden="true">·</span> {timeAgo(problem.createdAt)}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium text-muted-foreground">
          {count > 0 ? <span className="inline-flex items-center gap-1"><Users className="size-3.5 text-brand" />{formatCount(count)} {count === 1 ? "person interested" : "people interested"}</span> : null}
          {problem.commentCount > 0 ? <Link href={`/problems/${problem.slug}#discussion`} onClick={recordOpen} className="inline-flex items-center gap-1 hover:text-foreground"><MessageCircle className="size-3.5" />{formatCount(problem.commentCount)} discussing</Link> : null}
          {problem.status === "being_solved" ? <span>Someone is working on it</span> : null}
        </div>
        <div className="mt-4 flex items-center gap-2 border-t border-hairline pt-3">
          <VoteRail count={count} active={active} pending={pending} toggle={toggle} compact />
          {isSolved && problem.solutionCount > 0 ? <span className="ml-1 text-xs font-medium text-muted-foreground">Solution published</span> : null}
          <Link href={participationHref} onClick={recordOpen} className={cn("inline-flex h-10 items-center gap-1 text-sm font-semibold text-brand transition-colors hover:text-brand-hover", !isSolved && "ml-1")}>{participationLabel}<ArrowRight className="size-4" /></Link>
          <button type="button" onClick={handleShare} aria-label="Share problem" className="ml-auto flex size-9 items-center justify-center text-muted-foreground hover:text-foreground"><Share2 className="size-4" /></button>
          <ProblemActions problemId={problem.id} slug={problem.slug} status={problem.status} isOwn={problem.isOwn} isModerator={isModerator} isAuthenticated={isAuthenticated} bookmark={{ initialCount: problem.bookmarkCount, initialActive: problem.hasBookmarked }} />
        </div>
      </article>

      <article role="link" tabIndex={0} onClick={handleCardNavigation} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openProblem(); } }} className="hidden cursor-pointer items-stretch gap-4 rounded-xl border border-hairline bg-elevated px-4 py-3.5 outline-none transition-[border-color,box-shadow] duration-150 hover:border-rule hover:shadow-[0_4px_12px_rgb(15_23_42/0.05)] focus-visible:ring-3 focus-visible:ring-brand/25 sm:flex">
        <VoteRail count={count} active={active} pending={pending} toggle={toggle} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-3">
            <ProblemLink problemId={problem.id} slug={problem.slug} className="min-w-0 flex-1 truncate text-base leading-6 font-bold tracking-[-0.015em] text-foreground transition-colors hover:text-brand">{problem.title}</ProblemLink>
            <div className="flex shrink-0 items-center gap-0.5 text-muted-foreground">
              {problem.commentCount > 0 ? <Link href={`/problems/${problem.slug}#discussion`} onClick={recordOpen} aria-label={`${formatCount(problem.commentCount)} discussing`} className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-xs font-medium hover:bg-sunken hover:text-foreground"><MessageCircle className="size-3.5" />{formatCount(problem.commentCount)}</Link> : null}
              <BookmarkButton problemId={problem.id} initialCount={problem.bookmarkCount} initialActive={problem.hasBookmarked} isAuthenticated={isAuthenticated} className="h-7 px-1.5" />
              <button type="button" onClick={handleShare} aria-label="Share problem" title="Share" className="flex size-7 items-center justify-center rounded-md hover:bg-sunken hover:text-foreground"><Share2 className="size-3.5" /></button>
              <ProblemActions problemId={problem.id} slug={problem.slug} status={problem.status} isOwn={problem.isOwn} isModerator={isModerator} isAuthenticated={isAuthenticated} />
            </div>
          </div>
          {problem.excerpt ? <p className="mt-1 line-clamp-1 text-sm leading-5 text-muted-foreground">{problem.excerpt}</p> : null}
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground">
            <CategoryStatus problem={problem} />
            <AuthorLine author={problem.author} createdAt={problem.createdAt} editedAt={problem.editedAt} />
            {count > 0 ? <span className="inline-flex items-center gap-1"><Users className="size-3.5 text-brand" />{formatCount(count)} interested</span> : null}
            {problem.status === "being_solved" ? <span>Someone is working on it</span> : null}
            {isSolved && problem.solutionCount > 0 ? <span className="ml-auto font-medium text-muted-foreground">Solution published</span> : null}
            <Link href={participationHref} onClick={recordOpen} className={cn("inline-flex items-center gap-1 font-semibold text-brand transition-colors hover:text-brand-hover", !(isSolved && problem.solutionCount > 0) && "ml-auto")}>{participationLabel}<ArrowRight className="size-3.5" /></Link>
          </div>
        </div>
      </article>
    </>
  );
}
