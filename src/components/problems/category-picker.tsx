"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/shared/category-icon";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { CategoryDTO } from "@/types";

const POPULAR_COUNT = 4;

export function CategoryPicker({
  categories,
  value,
  onValueChange,
  invalid = false,
  onSuggestNew,
}: {
  categories: CategoryDTO[];
  value: string;
  onValueChange: (value: string) => void;
  invalid?: boolean;
  onSuggestNew: () => void;
}) {
  const [open, setOpenState] = useState(false);
  const [search, setSearch] = useState("");
  const isMobile = useIsMobile();

  function setOpen(next: boolean) {
    setOpenState(next);
    if (!next) setSearch("");
  }
  const selected = categories.find((category) => category.id === value);

  // Real usage data, not a curated guess — the categories people actually
  // post to most, so returning users skip the search entirely.
  const popular = useMemo(
    () =>
      [...categories]
        .sort((a, b) => b.problemCount - a.problemCount)
        .slice(0, POPULAR_COUNT),
    [categories]
  );

  function select(categoryId: string) {
    onValueChange(categoryId);
    setOpen(false);
  }

  function suggest() {
    setOpen(false);
    onSuggestNew();
  }

  const trigger = (
    <Button
      type="button"
      variant="outline"
      aria-invalid={invalid}
      aria-expanded={open}
      className="h-11 w-full justify-between rounded-md border-hairline px-3 font-normal shadow-none"
    >
      <span
        className={cn(
          "flex min-w-0 items-center gap-2 truncate",
          !selected && "text-muted-foreground"
        )}
      >
        {selected ? (
          <CategoryIcon name={selected.icon} className="size-3.5 text-muted-foreground" />
        ) : null}
        {selected?.name ?? "Choose a category"}
      </span>
      <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
    </Button>
  );

  function renderList(itemClassName: string, listClassName: string) {
    return (
      <Command className="rounded-none bg-transparent">
        <CommandInput
          autoFocus
          value={search}
          onValueChange={setSearch}
          placeholder="Search categories…"
        />
        <CommandList className={listClassName}>
          <CommandEmpty className="py-8 text-center">
            <p className="text-sm font-medium text-foreground">No categories found</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Try a different search.</p>
          </CommandEmpty>

          {!search.trim() ? (
            <CommandGroup heading="Popular">
              {popular.map((category) => (
                <CommandItem
                  key={`popular-${category.id}`}
                  value={`${category.name} popular`}
                  onSelect={() => select(category.id)}
                  className={itemClassName}
                >
                  <CategoryIcon name={category.icon} className="size-4 text-muted-foreground" />
                  {category.name}
                  {value === category.id ? (
                    <Check className="ml-auto size-4 text-primary" />
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          <CommandGroup heading={search.trim() ? undefined : "All categories"}>
            {categories.map((category) => (
              <CommandItem
                key={category.id}
                value={category.name}
                onSelect={() => select(category.id)}
                className={itemClassName}
              >
                <CategoryIcon name={category.icon} className="size-4 text-muted-foreground" />
                {category.name}
                {value === category.id ? (
                  <Check className="ml-auto size-4 text-primary" />
                ) : null}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>

        <div className="border-t border-hairline p-1">
          <button
            type="button"
            onClick={suggest}
            className="tap flex w-full items-center justify-center gap-1 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Can&apos;t find your category? Suggest one →
          </button>
        </div>
      </Command>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent
          side="bottom"
          className="flex h-[85vh] flex-col gap-0 rounded-t-xl p-0"
          showCloseButton={false}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Choose a category</SheetTitle>
          </SheetHeader>
          {renderList(
            "min-h-12 gap-2 rounded-lg px-4 py-3 text-base",
            "flex-1 overflow-y-auto"
          )}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        {renderList("gap-2 rounded-lg px-3 py-2.5", "max-h-72 overflow-y-auto")}
      </PopoverContent>
    </Popover>
  );
}
