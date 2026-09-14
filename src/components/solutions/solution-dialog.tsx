"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lightbulb, Loader2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploader } from "@/components/forms/image-uploader";
import { createSolution } from "@/actions/solutions";
import { createSolutionSchema } from "@/lib/validation/schemas";
import { SOLUTION_STATUSES, SOLUTION_STATUS_LABELS } from "@/lib/constants";
import type { ImageRef } from "@/types";
import type { z } from "zod";

type FormValues = z.input<typeof createSolutionSchema>;

export function SolutionDialog({
  problemId,
  problemTitle,
  open,
  onOpenChange,
}: {
  problemId: string;
  problemTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [images, setImages] = useState<ImageRef[]>([]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createSolutionSchema),
    defaultValues: {
      problemId,
      title: "",
      description: "",
      url: "",
      images: [],
      status: "proposed",
      isAnonymous: false,
    },
  });

  const description = watch("description") ?? "";

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await createSolution({ ...values, problemId, images });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? "Solution posted.");
      reset();
      setImages([]);
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] flex-col overflow-hidden sm:max-w-xl">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="size-4 text-brand" />
            Suggest a fix
          </DialogTitle>
          <DialogDescription className="line-clamp-2">
            For “{problemTitle}”. Describe what would actually solve it — an
            idea, an existing tool, or something you are building.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="-mx-6 min-h-0 flex-1 space-y-4 overflow-y-auto px-6"
        >
          <div className="space-y-1.5">
            <Label htmlFor="solution-title">Solution title</Label>
            <Input
              id="solution-title"
              {...register("title")}
              placeholder="Build a verified roommate network"
              autoComplete="off"
              aria-invalid={Boolean(errors.title)}
            />
            {errors.title ? (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="solution-description">How would it work?</Label>
              <span className="num text-[11px] text-muted-foreground">
                {description.length}/6000
              </span>
            </div>
            <Textarea
              id="solution-description"
              {...register("description")}
              rows={6}
              placeholder="Explain the approach and why it would work for the people who have this problem."
              className="resize-y"
              aria-invalid={Boolean(errors.description)}
            />
            {errors.description ? (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="solution-url">Link (optional)</Label>
              <Input
                id="solution-url"
                {...register("url")}
                placeholder="https://"
                inputMode="url"
                autoComplete="off"
              />
              {errors.url ? (
                <p className="text-xs text-destructive">{errors.url.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="solution-status">Stage</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="solution-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOLUTION_STATUSES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {SOLUTION_STATUS_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Images</Label>
            <ImageUploader
              value={images}
              onChange={setImages}
              folder="solutions"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-hairline p-3 transition-colors hover:bg-muted/40">
            <Controller
              control={control}
              name="isAnonymous"
              render={({ field }) => (
                <Checkbox
                  checked={Boolean(field.value)}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <span className="text-sm text-foreground">Post anonymously</span>
          </label>

          <DialogFooter className="sticky bottom-0 -mx-6 mt-2 border-t border-hairline bg-popover px-6 py-3">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Posting…
                </>
              ) : ("Post solution"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
