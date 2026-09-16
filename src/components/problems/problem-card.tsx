"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  MessageCircle,
  MousePointerClick,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { AuthorLine } from "@/components/shared/author-line";
import { AnonymousAvatar, UserAvatar } from "@/components/shared/user-avatar";
import { CategoryIcon } from "@/components/shared/category-icon";
import { ProblemActions } from "./problem-actions";
import { BookmarkButton } from "./bookmark-button";
import { ProblemLink } from "./problem-link";
import { StatusDot } from "./status-dot";
import { useValidation } from "./validate-button";
import { formatCount } from "@/lib/utils/format";
import { timeAgo } from "@/lib/utils/time";
import { cn } from "@/lib/utils";
import type { ProblemDTO } from "@/types";

const CATEGORY_PILL_TONES: Record<string, string> = {
  work: "bg-sky-700 text-white hover:bg-sky-800 dark:bg-sky-700 dark:hover:bg-sky-600",
  education: "bg-violet-700 text-white hover:bg-violet-800 dark:bg-violet-700 dark:hover:bg-violet-600",
  housing: "bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-700 dark:hover:bg-amber-600",
  money: "bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-700 dark:hover:bg-emerald-600",
  health: "bg-rose-700 text-white hover:bg-rose-800 dark:bg-rose-700 dark:hover:bg-rose-600",
  relationships: "bg-pink-700 text-white hover:bg-pink-800 dark:bg-pink-700 dark:hover:bg-pink-600",
  family: "bg-orange-700 text-white hover:bg-orange-800 dark:bg-orange-700 dark:hover:bg-orange-600",
  transportation: "bg-cyan-700 text-white hover:bg-cyan-800 dark:bg-cyan-700 dark:hover:bg-cyan-600",
  food: "bg-lime-700 text-white hover:bg-lime-800 dark:bg-lime-700 dark:hover:bg-lime-600",
  shopping: "bg-fuchsia-700 text-white hover:bg-fuchsia-800 dark:bg-fuchsia-700 dark:hover:bg-fuchsia-600",
  technology: "bg-indigo-700 text-white hover:bg-indigo-800 dark:bg-indigo-700 dark:hover:bg-indigo-600",
  government: "bg-slate-700 text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600",
  community: "bg-teal-700 text-white hover:bg-teal-800 dark:bg-teal-700 dark:hover:bg-teal-600",
  environment: "bg-green-700 text-white hover:bg-green-800 dark:bg-green-700 dark:hover:bg-green-600",
  other: "bg-slate-700 text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600",
};

function categoryPillTone(slug: string) {
  return CATEGORY_PILL_TONES[slug] ?? CATEGORY_PILL_TONES.other;
}

/**
 * A Reddit-style row for the problem listings. The vote rail is a
 * reinterpretation, not a port: this app only has one signal per person
 * ("I have this too"), not a signed vote, so up always ends in "counted in"
 * and down always ends in "not counted" — clicking the side you're already
 * on is a no-op rather than a second, opposite action.
 */
export function ProblemCard({
  problem,
  isAuthenticated,
  isModerator,
}: {
  problem: ProblemDTO;
  isAuthenticated: boolean;
  isModerator: boolean;
}) {
  const router = useRouter();
  const { count, active, pending, toggle } = useValidation(
    problem.id,
    problem.validationCount,
    problem.hasValidated,
    isAuthenticated,
  );

  function handleShare() {
    const url = `${window.location.origin}/problems/${problem.slug}`;
    if (navigator.share) {
      navigator.share({ title: problem.title, url }).catch(() => {
        /* Cancelling the share sheet is not an error. */
      });
      return;
    }
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Link copied."))
      .catch(() => toast.error("Couldn't copy the link."));
  }

  function recordOpen() {
    const url = `/api/problems/${problem.id}/click`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url);
      return;
    }
    void fetch(url, {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
    });
  }

  function openProblem() {
    recordOpen();
    router.push(`/problems/${problem.slug}`);
  }

  function handleCardNavigation(event: MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("a, button, input, select, textarea")) {
      return;
    }
    openProblem();
  }

  return (
    <>
      <article
        role="link"
        tabIndex={0}
        onClick={handleCardNavigation}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openProblem();
          }
        }}
        className="cursor-pointer border-b border-hairline py-5 first:pt-1 outline-none focus-visible:ring-3 focus-visible:ring-brand/25 sm:hidden"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {problem.author ? (
              <UserAvatar
                name={problem.author.name}
                username={problem.author.username}
                avatar={problem.author.avatar}
                size="mobile"
              />
            ) : (
              <AnonymousAvatar size="mobile" />
            )}
            <div className="min-w-0 text-sm">
              {problem.author ? (
                <Link
                  href={`/u/${problem.author.username}`}
                  className="truncate font-semibold text-foreground transition-colors hover:text-brand"
                >
                  {problem.author.name}
                </Link>
              ) : (
                <span className="font-semibold text-foreground">Anonymous</span>
              )}
              <span className="mx-1.5 text-muted-foreground" aria-hidden="true">·</span>
              <time dateTime={problem.createdAt} className="text-[0.8125rem] text-muted-foreground">
                {timeAgo(problem.createdAt).replace(" ago", "")}
              </time>
            </div>
          </div>
          <div className="shrink-0">
            <ProblemActions
              problemId={problem.id}
              slug={problem.slug}
              status={problem.status}
              isOwn={problem.isOwn}
              isModerator={isModerator}
              isAuthenticated={isAuthenticated}
              bookmark={{
                initialCount: problem.bookmarkCount,
                initialActive: problem.hasBookmarked,
              }}
            />
          </div>
        </div>

        {problem.category ? (
          <Link
            href={`/categories/${problem.category.slug}`}
            className={cn(
              "mt-3 inline-flex h-[30px] items-center gap-1.5 rounded-[0.625rem] border border-hairline bg-elevated px-2.5 text-[0.8125rem] font-semibold text-foreground transition-colors hover:bg-sunken",
            )}
          >
            <CategoryIcon name={problem.category.icon} className="size-3.5 text-brand" />
            {problem.category.name}
          </Link>
        ) : null}

        <ProblemLink
          problemId={problem.id}
          slug={problem.slug}
          className="mt-2.5 block line-clamp-3 text-[1.375rem] leading-[1.18] font-bold tracking-[-0.025em] text-foreground transition-colors hover:text-brand"
        >
          {problem.title}
        </ProblemLink>

        {problem.excerpt ? (
          <p className="mt-2 line-clamp-2 text-[0.9375rem] leading-[1.5] text-muted-foreground">
            {problem.excerpt}
          </p>
        ) : null}

        <div className="mt-3 flex h-11 items-center gap-1 border-t border-hairline pt-2 text-muted-foreground">
          <div className="inline-flex h-10 items-center rounded-lg border border-hairline bg-sunken px-0.5">
            <button
              type="button"
              onClick={() => {
                if (!active) toggle();
              }}
              disabled={pending}
              aria-label="I have this too"
              aria-pressed={active}
              className={cn(
                "flex size-9 items-center justify-center rounded-md transition-colors disabled:opacity-60",
                active
                  ? "bg-brand-muted text-brand"
                  : "hover:bg-emerald-50 hover:text-emerald-700",
              )}
            >
              <ArrowUp className="size-4" strokeWidth={2.4} />
            </button>
            <span className="num min-w-5 text-center text-[0.8125rem] font-semibold text-foreground">
              {formatCount(count)}
            </span>
            <button
              type="button"
              onClick={() => {
                if (active) toggle();
              }}
              disabled={pending}
              aria-label="Retract, I don't have this"
              className="flex size-9 items-center justify-center rounded-md transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
            >
              <ArrowDown className="size-4" strokeWidth={2.4} />
            </button>
          </div>

          <Link
            href={`/problems/${problem.slug}#discussion`}
            onClick={recordOpen}
            aria-label={`${formatCount(problem.commentCount)} comments`}
            className="inline-flex h-10 items-center gap-1 px-2 text-sm font-medium transition-colors hover:text-foreground"
          >
            <MessageCircle className="size-4" />
            <span className="num">{formatCount(problem.commentCount)}</span>
          </Link>

          <button
            type="button"
            onClick={handleShare}
            className="ml-auto inline-flex h-10 items-center gap-1 px-2 text-sm font-medium transition-colors hover:text-foreground"
          >
            <Share2 className="size-4" />
            <span>Share</span>
          </button>
        </div>
      </article>

      <div
        role="link"
        tabIndex={0}
        onClick={handleCardNavigation}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openProblem();
          }
        }}
        className="hidden cursor-pointer items-stretch gap-3 rounded-xl border border-hairline bg-elevated p-3.5 outline-none transition-colors hover:border-rule focus-visible:ring-3 focus-visible:ring-brand/25 sm:flex"
      >
      <div className="flex shrink-0 flex-col items-center justify-center gap-0.5 border-r border-hairline pr-3 sm:pr-4">
        <button
          type="button"
          onClick={() => {
            if (!active) toggle();
          }}
          disabled={pending}
          aria-label="I have this too"
          aria-pressed={active}
          className={cn(
            "tap flex size-8 items-center justify-center rounded-md transition-colors disabled:opacity-60 sm:size-7 sm:rounded-full",
            active
              ? "bg-brand-muted text-brand"
              : "text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700",
          )}
        >
          <ArrowUp className="size-4" strokeWidth={2.5} />
        </button>

        <span className="num text-sm font-bold text-foreground">
          {formatCount(count)}
        </span>

        <button
          type="button"
          onClick={() => {
            if (active) toggle();
          }}
          disabled={pending}
          aria-label="Retract, I don't have this"
          className="tap flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60 sm:size-7 sm:rounded-full"
        >
          <ArrowDown className="size-4" strokeWidth={2.5} />
        </button>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <ProblemLink
            problemId={problem.id}
            slug={problem.slug}
            className="min-w-0 text-lg leading-snug font-bold tracking-[-0.02em] text-foreground transition-colors hover:text-brand sm:truncate sm:text-base sm:tracking-[-0.015em]"
          >
            {problem.title}
          </ProblemLink>

          <div className="hidden shrink-0 items-center gap-1 sm:flex">
            <span
              title={`${formatCount(problem.clickCount)} ${problem.clickCount === 1 ? "click" : "clicks"}`}
              className="inline-flex h-7 items-center gap-1 px-1.5 text-xs font-medium text-muted-foreground"
            >
              <MousePointerClick className="size-3.5" />
              {formatCount(problem.clickCount)}
            </span>
            <Link
              href={`/problems/${problem.slug}#discussion`}
              aria-label={`${formatCount(problem.commentCount)} comments`}
              className="tap inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground"
            >
              <MessageCircle className="size-3.5" />
              {formatCount(problem.commentCount)}
            </Link>
            <BookmarkButton
              problemId={problem.id}
              initialCount={problem.bookmarkCount}
              initialActive={problem.hasBookmarked}
              isAuthenticated={isAuthenticated}
              className="h-7 px-1.5"
            />
            <button
              type="button"
              onClick={handleShare}
              aria-label="Share"
              title="Share"
              className="tap flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground"
            >
              <Share2 className="size-3.5" />
            </button>
            <ProblemActions
              problemId={problem.id}
              slug={problem.slug}
              status={problem.status}
              isOwn={problem.isOwn}
              isModerator={isModerator}
              isAuthenticated={isAuthenticated}
            />
          </div>
        </div>

        {problem.excerpt ? (
          <p className="mt-2 line-clamp-3 text-[0.9375rem] leading-6 text-muted-foreground sm:mt-1 sm:line-clamp-1 sm:text-sm">
            {problem.excerpt}
          </p>
        ) : null}

        <div className="mt-1.5 hidden flex-wrap items-center gap-2 text-sm text-muted-foreground sm:flex">
          {problem.category ? (
            <Link
              href={`/categories/${problem.category.slug}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
                categoryPillTone(problem.category.slug),
              )}
            >
              <CategoryIcon name={problem.category.icon} className="size-3.5" />
              {problem.category.name}
            </Link>
          ) : null}
          <AuthorLine
            author={problem.author}
            createdAt={problem.createdAt}
            editedAt={problem.editedAt}
          />
          {problem.status !== "open" ? (
            <StatusDot status={problem.status} />
          ) : null}
        </div>
      </div>
      </div>
    </>
  );
}
