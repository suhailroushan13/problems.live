"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { SearchHit, SearchResults } from "@/lib/data/search";

const EMPTY: SearchResults = {
  problems: [],
  solutions: [],
  categories: [],
  users: [],
  total: 0,
};

function HitRow({ hit, onSelect }: { hit: SearchHit; onSelect: () => void }) {
  return (
    <CommandItem
      value={`${hit.kind}-${hit.id}-${hit.title}`}
      onSelect={onSelect}
      className="gap-3 py-2.5"
    >
      <span className="min-w-0 flex-1 truncate text-sm">{hit.title}</span>
      {hit.meta ? (
        <span className="num shrink-0 text-xs text-muted-foreground">
          {hit.meta}
        </span>
      ) : null}
    </CommandItem>
  );
}

export function SearchCommand({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const trimmed = query.trim();
  const tooShort = trimmed.length < 2;

  // Debounced and abortable: typing never fires a request per keystroke, and a
  // slow earlier response can never overwrite a newer one.
  useEffect(() => {
    if (trimmed.length < 2) return;

    const controller = new AbortController();
    let cancelled = false;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error("search failed");
        const data = (await response.json()) as SearchResults;
        if (!cancelled) setResults(data);
      } catch (error) {
        if (!cancelled && (error as Error).name !== "AbortError") {
          setResults(EMPTY);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router]
  );

  const visible = tooShort ? EMPTY : results;
  const busy = loading && !tooShort;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Search problems"
        aria-keyshortcuts="Meta+K Control+K"
        className={cn("size-10 rounded-full text-muted-foreground", className)}
      >
        <Search className="size-[1.125rem]" />
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search problems.live"
        description="Find problems, solutions, categories and people."
        commandProps={{ shouldFilter: false }}
      >
        <CommandInput
          placeholder="Search problems, solutions, people…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[min(26rem,60vh)]">
          {busy ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Spinner className="size-4" /> Searching…
            </div>
          ) : null}

          {!busy && tooShort ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Type at least two characters to search.
            </div>
          ) : null}

          {!busy && !tooShort && visible.total === 0 ? (
            <CommandEmpty>Nothing matches “{trimmed}”.</CommandEmpty>
          ) : null}

          {!busy && visible.problems.length > 0 ? (
            <CommandGroup heading="Problems">
              {visible.problems.map((hit) => (
                <HitRow key={hit.id} hit={hit} onSelect={() => go(hit.href)} />
              ))}
            </CommandGroup>
          ) : null}

          {!busy && visible.solutions.length > 0 ? (
            <CommandGroup heading="Solutions">
              {visible.solutions.map((hit) => (
                <HitRow key={hit.id} hit={hit} onSelect={() => go(hit.href)} />
              ))}
            </CommandGroup>
          ) : null}

          {!busy && visible.categories.length > 0 ? (
            <CommandGroup heading="Categories">
              {visible.categories.map((hit) => (
                <HitRow key={hit.id} hit={hit} onSelect={() => go(hit.href)} />
              ))}
            </CommandGroup>
          ) : null}

          {!busy && visible.users.length > 0 ? (
            <CommandGroup heading="People">
              {visible.users.map((hit) => (
                <HitRow key={hit.id} hit={hit} onSelect={() => go(hit.href)} />
              ))}
            </CommandGroup>
          ) : null}

          {!busy && !tooShort ? (
            <CommandGroup heading="Go further">
              <CommandItem
                value="see-all-results"
                onSelect={() =>
                  go(`/problems?q=${encodeURIComponent(trimmed)}`)
                }
                className="gap-3 py-2.5 text-sm"
              >
                See all problems matching “{trimmed}”
              </CommandItem>
            </CommandGroup>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
