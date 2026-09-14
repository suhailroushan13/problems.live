"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProblemForm } from "./problem-form";
import { getRemainingCredits } from "@/actions/problems";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth/current-user";
import type { CategoryDTO } from "@/types";

/**
 * Header entry point. Signed-out visitors are sent straight into Google
 * sign-in and returned to the composer afterwards.
 */
export function PostProblemButton({
  user,
  categories,
  label = "Post problem",
  className,
}: {
  user: SessionUser | null;
  categories: CategoryDTO[];
  /** Full-width label text; a short "Post" always shows on phones. */
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [credits, setCredits] = useState(user?.problemCredits ?? 0);
  const router = useRouter();
  const pathname = usePathname();

  // Credits change as other people validate your problems, so refresh the
  // number when the composer opens rather than trusting the page-load value.
  useEffect(() => {
    if (!open || !user) return;
    void getRemainingCredits().then(setCredits);
  }, [open, user]);

  if (!user) {
    return (
      <Button
        asChild
        size="sm"
        className={cn("gap-1.5 whitespace-nowrap", className)}
      >
        <a
          href={`/api/auth/google?next=${encodeURIComponent(
            pathname === "/" ? "/problems/new" : pathname
          )}`}
        >
          <Plus className="size-3.5" />
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">Post</span>
        </a>
      </Button>
    );
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className={cn("gap-1.5 whitespace-nowrap", className)}
      >
        <Plus className="size-3.5" />
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">Post</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[92dvh] flex-col overflow-hidden sm:max-w-2xl">
          <DialogHeader className="text-left">
            <DialogTitle className="display text-2xl">
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
              onCancel={() => setOpen(false)}
              onDone={(slug) => {
                setOpen(false);
                router.push(`/problems/${slug}`);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
