"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Globe, Loader2, MapPin, Plus } from "lucide-react";
import { toast } from "sonner";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUploader } from "@/components/forms/image-uploader";
import { CategoryIcon } from "@/components/shared/category-icon";
import { SafeText } from "@/components/shared/safe-text";
import { AnonymousAvatar, UserAvatar } from "@/components/shared/user-avatar";
import { DuplicateWarning } from "./duplicate-warning";
import { SuggestCategoryDialog } from "./suggest-category-dialog";
import { checkForDuplicates, createProblem, updateProblem } from "@/actions/problems";
import { createProblemSchema } from "@/lib/validation/schemas";
import { LOCATION_SCOPES } from "@/lib/constants";
import { COUNTRIES } from "@/lib/countries";
import { cn } from "@/lib/utils";
import type { SimilarProblem } from "@/lib/similarity";
import type { CategoryDTO, ImageRef, ProblemDTO } from "@/types";
import type { z } from "zod";

type FormValues = z.input<typeof createProblemSchema>;

const SCOPE_LABELS: Record<(typeof LOCATION_SCOPES)[number], string> = {
  global: "Everywhere",
  country: "A country",
  city: "A city or region",
};

export function ProblemForm({
  categories,
  viewer,
  credits,
  problem,
  initialTitle,
  initialCategoryId,
  onDone,
  onCancel,
}: {
  categories: CategoryDTO[];
  viewer: { name: string; username: string; avatar?: string; reputation: number };
  credits: number;
  problem?: ProblemDTO;
  /** Prefilled when the author started typing in the homepage composer. */
  initialTitle?: string;
  initialCategoryId?: string;
  onDone?: (slug: string) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const isEditing = Boolean(problem);
  const [pending, startTransition] = useTransition();
  const [images, setImages] = useState<ImageRef[]>(problem?.images ?? []);
  const [duplicates, setDuplicates] = useState<SimilarProblem[]>([]);
  const [dismissedDuplicates, setDismissedDuplicates] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [tab, setTab] = useState("write");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const lastCheckedTitle = useRef("");

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createProblemSchema),
    defaultValues: {
      title: problem?.title ?? initialTitle ?? "",
      description: problem?.description ?? "",
      categoryId: problem?.category?.id ?? initialCategoryId ?? "",
      location: {
        scope: problem?.location.scope ?? "global",
        country: problem?.location.country ?? "",
        region: problem?.location.region ?? "",
        city: problem?.location.city ?? "",
      },
      images: problem?.images ?? [],
      isAnonymous: problem?.isAnonymous ?? false,
      acknowledgedDuplicates: Boolean(problem),
    },
  });

  const title = watch("title") ?? "";
  const description = watch("description") ?? "";
  const scope = watch("location.scope") ?? "global";
  const isAnonymous = watch("isAnonymous") ?? false;
  const categoryId = watch("categoryId");
  const selectedCategory = categories.find((c) => c.id === categoryId);

  // Duplicate detection runs while the author types the title — before they
  // have invested effort in the description.
  useEffect(() => {
    if (isEditing) return;

    const trimmed = title.trim();
    if (trimmed.length < 12 || trimmed === lastCheckedTitle.current) return;

    const timer = setTimeout(async () => {
      lastCheckedTitle.current = trimmed;
      setCheckingDuplicates(true);
      const result = await checkForDuplicates({ title: trimmed, description });
      setCheckingDuplicates(false);
      if (result.ok) {
        setDuplicates(result.data);
        if (result.data.length > 0) setDismissedDuplicates(false);
      }
    }, 600);

    return () => clearTimeout(timer);
    // `description` is intentionally excluded: re-checking on every keystroke
    // of a long body would be wasteful, and the title carries the signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, isEditing]);

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const payload = { ...values, images };

      const result = isEditing
        ? await updateProblem({
            problemId: problem!.id,
            title: payload.title,
            description: payload.description,
            categoryId: payload.categoryId,
            location: payload.location ?? { scope: "global" },
            isAnonymous: payload.isAnonymous ?? false,
          })
        : await createProblem(payload);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? "Your problem is live.");
      const slug = result.data.slug;

      if (onDone) onDone(slug);
      else router.push(`/problems/${slug}`);
      router.refresh();
    });
  }

  const showDuplicates =
    !isEditing && !dismissedDuplicates && duplicates.length > 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-col">
      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-col gap-0">
        <TabsList className="mb-5 self-start">
          <TabsTrigger value="write">Write</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="write" className="space-y-5">
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="title">Problem title</Label>
              <span
                className={cn("num text-[11px]",
                  title.length > 140
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {title.length}/140
              </span>
            </div>
            <Input
              id="title"
              {...register("title")}
              placeholder="Finding trustworthy roommates is difficult"
              autoComplete="off"
              aria-invalid={Boolean(errors.title)}
            />
            <p className="text-xs text-muted-foreground">
              Describe the problem itself, not the solution you have in mind.
            </p>
            {errors.title ? (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            ) : null}
          </div>

          {checkingDuplicates ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Checking for similar problems…
            </p>
          ) : null}

          {showDuplicates ? (
            <DuplicateWarning
              matches={duplicates}
              onDismiss={() => {
                setDismissedDuplicates(true);
                setValue("acknowledgedDuplicates", true);
              }}
            />
          ) : null}

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="description">Description</Label>
              <span className="num text-[11px] text-muted-foreground">
                {description.length}/8000
              </span>
            </div>
            <Textarea
              id="description"
              {...register("description")}
              rows={7}
              placeholder="Who has this problem, when does it happen, and what makes it hard today? Concrete detail helps other people recognise it — and helps builders solve it."
              className="resize-y"
              aria-invalid={Boolean(errors.description)}
            />
            {errors.description ? (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="category">Category</Label>
                <button
                  type="button"
                  onClick={() => setSuggestOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-brand"
                >
                  <Plus className="size-3" />
                  Suggest a new one
                </button>
              </div>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="category"
                      className="w-full"
                      aria-invalid={Boolean(errors.categoryId)}
                    >
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <span className="flex items-center gap-2">
                            <CategoryIcon
                              name={category.icon}
                              className="size-3.5 text-muted-foreground"
                            />
                            {category.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.categoryId ? (
                <p className="text-xs text-destructive">
                  {errors.categoryId.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="scope">Where does this happen?</Label>
              <Controller
                control={control}
                name="location.scope"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="scope" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATION_SCOPES.map((value) => (
                        <SelectItem key={value} value={value}>
                          <span className="flex items-center gap-2">
                            {value === "global" ? (
                              <Globe className="size-3.5 text-muted-foreground" />
                            ) : (
                              <MapPin className="size-3.5 text-muted-foreground" />
                            )}
                            {SCOPE_LABELS[value]}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {scope !== "global" ? (
            <div className="grid gap-4 rounded-lg border border-hairline bg-sunken/50 p-3.5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="country" className="text-xs">
                  Country
                </Label>
                <Controller
                  control={control}
                  name="location.country"
                  render={({ field }) => (
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="country" className="w-full bg-elevated">
                        <SelectValue placeholder="Select a country" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {scope === "city" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-xs">
                    City or region
                  </Label>
                  <Input
                    id="city"
                    {...register("location.city")}
                    placeholder="e.g. Bengaluru"
                    className="bg-elevated"
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {!isEditing ? (
            <div className="space-y-1.5">
              <Label>Images</Label>
              <ImageUploader
                value={images}
                onChange={setImages}
                folder="problems"
              />
            </div>
          ) : null}

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-hairline p-3.5 transition-colors hover:bg-muted/40">
            <Controller
              control={control}
              name="isAnonymous"
              render={({ field }) => (
                <Checkbox
                  checked={Boolean(field.value)}
                  onCheckedChange={field.onChange}
                  className="mt-0.5"
                />
              )}
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">
                Post anonymously
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                Your name is hidden from everyone. The post still counts toward
                your credits and reputation, and moderators can still act on it.
              </span>
            </span>
          </label>
        </TabsContent>

        <TabsContent value="preview">
          <PreviewCard
            title={title}
            description={description}
            category={selectedCategory}
            isAnonymous={isAnonymous}
            viewer={viewer}
            images={images}
          />
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex flex-col gap-3 border-t border-hairline pt-4 sm:flex-row sm:items-center sm:justify-between">
        {!isEditing ? (
          <p className="num text-xs text-muted-foreground">
            {credits} problem {credits === 1 ? "credit" : "credits"} left
          </p>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2">
          {onCancel ? (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={onCancel}
              disabled={pending}
            >
              Cancel
            </Button>
          ) : null}

          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => setTab(tab === "write" ? "preview" : "write")}
            disabled={pending}
          >
            {tab === "write" ? "Preview" : "Keep writing"}
          </Button>

          <Button type="submit" size="lg" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {isEditing ? "Saving…" : "Publishing…"}
              </>
            ) : isEditing ? ("Save changes"
            ) : ("Publish problem"
            )}
          </Button>
        </div>
      </div>

      <SuggestCategoryDialog open={suggestOpen} onOpenChange={setSuggestOpen} />
    </form>
  );
}

function PreviewCard({
  title,
  description,
  category,
  isAnonymous,
  viewer,
  images,
}: {
  title: string;
  description: string;
  category?: CategoryDTO;
  isAnonymous: boolean;
  viewer: { name: string; username: string; avatar?: string };
  images: ImageRef[];
}) {
  if (!title.trim() && !description.trim()) {
    return (
      <div className="rounded-xl border border-dashed border-hairline bg-sunken/40 px-6 py-14 text-center text-sm text-muted-foreground">
        Write something first — your preview shows up here.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-hairline bg-elevated p-5">
      {category ? (
        <p className="label mb-3 inline-flex items-center gap-1.5 text-muted-foreground">
          <CategoryIcon name={category.icon} className="size-3" />
          {category.name}
        </p>
      ) : null}

      <h3 className="display text-2xl text-foreground">
        {title || "Untitled problem"}
      </h3>

      {description ? (
        <SafeText className="mt-3">{description}</SafeText>
      ) : null}

      {images.length > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {images.length} image{images.length === 1 ? "" : "s"} attached
        </p>
      ) : null}

      <div className="mt-5 flex items-center gap-2 border-t border-hairline pt-3.5 text-xs text-muted-foreground">
        {isAnonymous ? (
          <>
            <AnonymousAvatar size="xs" />
            <span>Anonymous</span>
          </>
        ) : (
          <>
            <UserAvatar
              name={viewer.name}
              username={viewer.username}
              avatar={viewer.avatar}
              size="xs"
            />
            <span>@{viewer.username}</span>
          </>
        )}
        <span className="text-muted-foreground/50">·</span>
        <span>just now</span>
      </div>
    </div>
  );
}
