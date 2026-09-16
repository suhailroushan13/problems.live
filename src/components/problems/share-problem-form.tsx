"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProblemForm } from "./problem-form";
import { getRemainingCredits } from "@/actions/problems";
import { goToSignIn } from "@/lib/auth/sign-in-redirect";
import type { SessionUser } from "@/lib/auth/current-user";
import type { CategoryDTO } from "@/types";

/**
 * The one control on the landing page. What is typed here carries into the
 * full composer, so nobody ever starts from an empty form.
 */
export function ShareProblemForm({
  user,
  categories,
}: {
  user: SessionUser | null;
  categories: CategoryDTO[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [open, setOpen] = useState(false);
  const [credits, setCredits] = useState(user?.problemCredits ?? 0);

  useEffect(() => {
    if (!open || !user) return;
    void getRemainingCredits().then(setCredits);
  }, [open, user]);

  function start() {
    if (!user) {
      goToSignIn(pathname);
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          start();
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <div className="relative flex-1">
          <Label htmlFor="share-problem" className="sr-only">
            What problem are you experiencing?
          </Label>
          <CircleDot
            className="pointer-events-none absolute top-1/2 left-5 size-[1.125rem] -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="share-problem"
            value={title}
            onChange={(event) => setTitle(event.target.value.slice(0, 140))}
            placeholder="What problem are you experiencing?"
            autoComplete="off"
            className="h-12 w-full border-border bg-elevated pr-5 pl-13 shadow-none placeholder:text-muted-foreground"
          />
        </div>

        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger
            aria-label="Category"
            className="h-12! w-full border-border bg-elevated px-4 shadow-none sm:w-56"
          >
            <SelectValue placeholder="Choose a category" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="submit"
          size="lg"
          className="w-full shrink-0 sm:w-auto"
        >
          Share problem
        </Button>
      </form>

      {user ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="flex max-h-[92dvh] flex-col overflow-hidden rounded-xl sm:max-w-2xl">
            <DialogHeader className="text-left">
              <DialogTitle className="text-h3">
                Share a problem
              </DialogTitle>
              <DialogDescription>
                Describe something that is genuinely hard today. If other people
                have it too, they will say so.
              </DialogDescription>
            </DialogHeader>

            <div className="-mx-6 min-h-0 flex-1 overflow-y-auto px-6">
              <ProblemForm
                categories={categories}
                viewer={user}
                credits={credits}
                initialTitle={title}
                initialCategoryId={categoryId}
                onCancel={() => setOpen(false)}
                onDone={(slug) => {
                  setOpen(false);
                  setTitle("");
                  router.push(`/problems/${slug}`);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
