"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { suggestCategory } from "@/actions/categories";

export function SuggestCategoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await suggestCategory({ name, description });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? "Suggestion sent.");
      onOpenChange(false);
      setName("");
      setDescription("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Suggest a category</DialogTitle>
          <DialogDescription>
            New categories are reviewed by an admin before they appear for
            everyone. Pick the closest existing category in the meantime.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(event) => setName(event.target.value.slice(0, 40))}
              placeholder="e.g. Accessibility"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category-description">
              What belongs here? (optional)
            </Label>
            <Textarea
              id="category-description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value.slice(0, 240))
              }
              rows={3}
              placeholder="One sentence describing the kinds of problems that fit."
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            size="lg"
            onClick={submit}
            disabled={pending || name.trim().length < 3}
          >
            {pending ? "Sending…" : "Suggest category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
