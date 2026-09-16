"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommentItem } from "./comment-item";
import type { SessionUser } from "@/lib/auth/current-user";
import type { CommentDTO } from "@/types";

const SORTS = [
  { value: "best", label: "Best" },
  { value: "new", label: "New" },
  { value: "old", label: "Oldest" },
] as const;
type SortValue = (typeof SORTS)[number]["value"];

function sortRoots(comments: CommentDTO[], sort: SortValue): CommentDTO[] {
  const sorted = [...comments];
  switch (sort) {
    case "new":
      return sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case "old":
      return sorted.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    default:
      return sorted.sort(
        (a, b) =>
          b.helpfulCount - a.helpfulCount ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }
}

/**
 * Keeps a comment when its own text matches, or any reply's does — so a
 * matching reply still shows up with its parent for context. Non-matching
 * siblings within a kept thread are filtered out.
 */
function filterComments(comments: CommentDTO[], query: string): CommentDTO[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return comments;

  const walk = (list: CommentDTO[]): CommentDTO[] =>
    list.reduce<CommentDTO[]>((acc, comment) => {
      const replies = walk(comment.replies);
      const selfMatches = comment.content.toLowerCase().includes(needle);
      if (selfMatches || replies.length > 0) {
        acc.push({ ...comment, replies });
      }
      return acc;
    }, []);

  return walk(comments);
}

export function CommentList({
  comments,
  problemId,
  solutionId,
  user,
}: {
  comments: CommentDTO[];
  problemId: string;
  solutionId?: string | null;
  user: SessionUser | null;
}) {
  const [sort, setSort] = useState<SortValue>("best");
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const filtered = filterComments(comments, search);
    return sortRoots(filtered, sort);
  }, [comments, search, sort]);

  const sortLabel = SORTS.find((s) => s.value === sort)?.label ?? "Best";

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="tap inline-flex h-9 items-center gap-1.5 rounded-md border border-hairline bg-elevated px-3 text-xs font-medium text-foreground transition-colors hover:border-brand-border"
            >
              <span className="text-muted-foreground">Sort by:</span>
              {sortLabel}
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-36">
            {SORTS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onSelect={() => setSort(option.value)}
              >
                {option.label}
                {sort === option.value ? (
                  <Check className="ml-auto size-3.5 text-primary" />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative min-w-0 flex-1 sm:max-w-64">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search comments…"
            aria-label="Search comments"
            className="h-9 w-full rounded-md border border-hairline bg-elevated pr-8 pl-8 text-xs text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {visible.length > 0 ? (
        <div>
          {visible.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              user={user}
              problemId={problemId}
              solutionId={solutionId}
            />
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No comments found. Try a different search.
        </p>
      )}
    </div>
  );
}
