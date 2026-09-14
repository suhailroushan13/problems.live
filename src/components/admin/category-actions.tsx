"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Merge, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  approveCategory,
  mergeCategories,
  rejectCategory,
} from "@/actions/admin";
import type { AdminCategory } from "@/lib/data/admin";

export function CategoryActions({
  category,
  mergeTargets,
}: {
  category: AdminCategory;
  mergeTargets: AdminCategory[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mergeOpen, setMergeOpen] = useState(false);
  const [target, setTarget] = useState("");

  function run(action: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "That didn't work.");
        return;
      }
      toast.success(result.message ?? "Done.");
      setMergeOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        {category.status === "pending" ? (
          <>
            <Button
              size="sm"
              onClick={() => run(() => approveCategory(category.id))}
              disabled={pending}
            >
              <Check className="size-3.5" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => run(() => rejectCategory(category.id))}
              disabled={pending}
              className="text-destructive"
            >
              <X className="size-3.5" />
              Reject
            </Button>
          </>
        ) : null}

        {category.status === "approved" && mergeTargets.length > 0 ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMergeOpen(true)}
            disabled={pending}
          >
            <Merge className="size-3.5" />
            Merge
          </Button>
        ) : null}
      </div>

      <AlertDialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge “{category.name}” into…</AlertDialogTitle>
            <AlertDialogDescription>
              Every problem moves to the target category, and “{category.name}”
              is retired. This cannot be undone automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a destination category" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {mergeTargets.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name} ({item.problemCount})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending || !target}
              onClick={(event) => {
                event.preventDefault();
                run(() => mergeCategories(category.id, target));
              }}
            >
              {pending ? "Merging…" : "Merge"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
