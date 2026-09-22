"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Check, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ImageUploader } from "@/components/forms/image-uploader";
import { MarkdownEditor } from "@/components/forms/markdown-editor";
import { CategoryIcon } from "@/components/shared/category-icon";
import { MarkdownContent } from "@/components/shared/markdown-content";
import { AnonymousAvatar, UserAvatar } from "@/components/shared/user-avatar";
import { CategoryPicker } from "./category-picker";
import { DuplicateWarning } from "./duplicate-warning";
import { PriorityBadge } from "./priority-badge";
import { SuggestCategoryDialog } from "./suggest-category-dialog";
import {
  checkForDuplicates,
  createProblem,
  updateProblem,
} from "@/actions/problems";
import { createProblemSchema } from "@/lib/validation/schemas";
import {
  LOCATION_SCOPES,
  PROBLEM_PRIORITIES,
  PROBLEM_PRIORITY_LABELS,
  type ProblemPriority,
} from "@/lib/constants";
import { COUNTRIES } from "@/lib/countries";
import { cn } from "@/lib/utils";
import type { SimilarProblem } from "@/lib/similarity";
import type { CategoryDTO, ImageRef, ProblemDTO } from "@/types";
import type { z } from "zod";

type FormValues = z.input<typeof createProblemSchema>;
const DRAFT_KEY = "problems.live:new-problem-draft:v1";
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
  initialLocation,
  initialTitle,
  initialCategoryId,
  onDone,
  onCancel,
  compact = false,
}: {
  categories: CategoryDTO[];
  viewer: {
    name: string;
    username: string;
    avatar?: string;
    reputation: number;
  };
  credits: number;
  problem?: ProblemDTO;
  initialLocation?: {
    scope: "global" | "country" | "city";
    country?: string;
    region?: string;
    city?: string;
  };
  initialTitle?: string;
  initialCategoryId?: string;
  onDone?: (slug: string) => void;
  onCancel?: () => void;
  /** A denser rhythm for the standalone new-problem composer. */
  compact?: boolean;
}) {
  const router = useRouter();
  const isEditing = Boolean(problem);
  const showMobileActions = !isEditing && !onDone && !onCancel;
  const [pending, startTransition] = useTransition();
  const [images, setImages] = useState<ImageRef[]>(problem?.images ?? []);
  const [duplicates, setDuplicates] = useState<SimilarProblem[]>([]);
  const [dismissedDuplicates, setDismissedDuplicates] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const lastCheckedTitle = useRef("");
  const draftLoaded = useRef(
    Boolean(problem || initialTitle || initialCategoryId),
  );
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createProblemSchema),
    defaultValues: {
      title: problem?.title ?? initialTitle ?? "",
      description: problem?.description ?? "",
      categoryId: problem?.category?.id ?? initialCategoryId ?? "",
      location: {
        scope: problem?.location.scope ?? initialLocation?.scope ?? "global",
        country: problem?.location.country ?? initialLocation?.country ?? "",
        region: problem?.location.region ?? initialLocation?.region ?? "",
        city: problem?.location.city ?? initialLocation?.city ?? "",
      },
      images: problem?.images ?? [],
      isAnonymous: problem?.isAnonymous ?? false,
      priority: problem?.priority ?? "normal",
      acknowledgedDuplicates: Boolean(problem),
    },
  });
  const watched = useWatch({ control });
  const title = watched.title ?? "";
  const titleWordCount = title.trim() ? title.trim().split(/\s+/).length : 0;
  const description = watched.description ?? "";
  const scope = watched.location?.scope ?? "global";
  const country = watched.location?.country ?? "";
  const city = watched.location?.city ?? "";
  const isAnonymous = watched.isAnonymous ?? false;
  const priority = (watched.priority ?? "normal") as ProblemPriority;
  const categoryId = watched.categoryId ?? "";
  const selectedCategory = categories.find(
    (category) => category.id === categoryId,
  );

  useEffect(() => {
    if (draftLoaded.current) return;
    try {
      const saved = window.localStorage.getItem(DRAFT_KEY);
      if (saved)
        reset((current) => ({
          ...current,
          ...(JSON.parse(saved) as Partial<FormValues>),
        }));
    } catch {
      /* Storage is optional in private browsing. */
    }
    draftLoaded.current = true;
  }, [reset]);

  useEffect(() => {
    if (isEditing || !draftLoaded.current || (!title && !description)) return;
    try {
      window.localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          title,
          description,
          categoryId,
          location: { scope, country, city },
          isAnonymous,
        }),
      );
    } catch {
      /* The composer remains usable without storage. */
    }
  }, [
    categoryId,
    city,
    country,
    description,
    isAnonymous,
    isEditing,
    scope,
    title,
  ]);

  useEffect(() => {
    if (isEditing) return;
    const trimmed = title.trim();
    if (trimmed.length < 12 || trimmed === lastCheckedTitle.current) return;
    const timer = window.setTimeout(async () => {
      lastCheckedTitle.current = trimmed;
      setCheckingDuplicates(true);
      const result = await checkForDuplicates({ title: trimmed, description });
      setCheckingDuplicates(false);
      if (result.ok) {
        setDuplicates(result.data);
        if (result.data.length) setDismissedDuplicates(false);
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [description, isEditing, title]);

  function onSubmit(values: FormValues) {
    setSubmitError(null);
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
            priority: payload.priority ?? "normal",
          })
        : await createProblem(payload);
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* Nothing to remove. */
      }
      if (onDone) onDone(result.data.slug);
      else router.push(`/problems/${result.data.slug}`);
      router.refresh();
    });
  }

  function saveDraft() {
    try {
      window.localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          title,
          description,
          categoryId,
          location: { scope, country, city },
          isAnonymous,
          priority,
          images,
        }),
      );
      toast.success("Draft saved on this device.");
    } catch {
      toast.error("Couldn’t save this draft.");
    }
  }

  const showDuplicates =
    !isEditing && !dismissedDuplicates && duplicates.length > 0;
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn(
        "min-w-0",
        showMobileActions && "pb-24 sm:pb-0",
      )}
    >
      <div className={cn("space-y-7", compact && "space-y-3.5")}>
        <section className={cn("space-y-2", compact && "space-y-1.5")}>
          <div className="flex items-baseline justify-between gap-4">
            <Label
              htmlFor="title"
              className="text-sm font-semibold text-foreground"
            >
              What&apos;s the problem?
            </Label>
            {title.length > 100 ? (
              <span
                className={cn(
                  "num text-xs",
                  title.length > 140
                    ? "text-destructive"
                    : "text-muted-foreground",
                )}
              >
                {title.length}/140
              </span>
            ) : null}
          </div>
          <Input
            id="title"
            {...register("title")}
            autoFocus
            autoComplete="off"
            placeholder="e.g. Finding trustworthy roommates is difficult"
            className="h-12 rounded-md border-input px-3.5 text-base font-medium shadow-none placeholder:font-normal"
            aria-invalid={Boolean(errors.title)}
          />
          <p className={cn("text-xs text-muted-foreground", compact && "leading-4")}>
            {titleWordCount > 10
              ? `${titleWordCount} words, shorten it to 10 or fewer so the full title stays easy to read, especially on phones.`
              : "Describe the problem, not the solution. Aim for 10 words or fewer so the full title stays easy to read, especially on phones."}
          </p>
          <FieldError message={errors.title?.message} />
        </section>

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

        <section className={cn("space-y-2", compact && "space-y-1.5")}>
          <div className="flex items-baseline justify-between gap-4">
            <Label
              htmlFor="description"
              className="text-sm font-semibold text-foreground"
            >
              Tell us more
            </Label>
            {description.length > 500 ? (
              <span className="num text-xs text-muted-foreground">
                {description.length}/8000
              </span>
            ) : null}
          </div>
          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <MarkdownEditor
                id="description"
                value={field.value ?? ""}
                onChange={field.onChange}
                minRows={compact ? 4 : 5}
                folder="problems"
                compact={compact}
                placeholder="Who faces this problem? When does it happen? What makes it difficult?"
                aria-invalid={Boolean(errors.description)}
              />
            )}
          />
          <p className={cn("text-xs text-muted-foreground", compact && "leading-4")}>
            A real example or specific detail helps. Markdown is supported,
            paste an image straight in.
          </p>
          <FieldError message={errors.description?.message} />
        </section>

        <section className={cn("grid gap-4 sm:grid-cols-2", compact && "gap-3 lg:grid-cols-3")}>
          <div className={cn("space-y-2", compact && "space-y-1.5")}>
            <Label className="text-sm font-semibold text-foreground">
              Category
            </Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <CategoryPicker
                  categories={categories}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  invalid={Boolean(errors.categoryId)}
                  onSuggestNew={() => setSuggestOpen(true)}
                />
              )}
            />
            <FieldError message={errors.categoryId?.message} />
          </div>
          <div className={cn("space-y-2", compact && "space-y-1.5")}>
            <Label className="text-sm font-semibold text-foreground">
              Where?
            </Label>
            <Controller
              control={control}
              name="location.scope"
              render={({ field }) => (
                <SearchablePicker
                  value={field.value ?? "global"}
                  onValueChange={field.onChange}
                  placeholder="Everywhere"
                  searchPlaceholder="Search locations…"
                  items={LOCATION_SCOPES.map((value) => ({
                    value,
                    label: SCOPE_LABELS[value],
                  }))}
                />
              )}
            />
          </div>
          {compact ? (
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground">Priority</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <SearchablePicker
                    value={field.value ?? "normal"}
                    onValueChange={field.onChange}
                    placeholder="Normal"
                    searchPlaceholder="Search…"
                    items={PROBLEM_PRIORITIES.map((value) => ({
                      value,
                      label: PROBLEM_PRIORITY_LABELS[value],
                    }))}
                  />
                )}
              />
            </div>
          ) : null}
        </section>

        {!compact ? (
        <section className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">
            Priority
          </Label>
          <Controller
            control={control}
            name="priority"
            render={({ field }) => (
              <div className="sm:max-w-56">
                <SearchablePicker
                  value={field.value ?? "normal"}
                  onValueChange={field.onChange}
                  placeholder="Normal"
                  searchPlaceholder="Search…"
                  items={PROBLEM_PRIORITIES.map((value) => ({
                    value,
                    label: PROBLEM_PRIORITY_LABELS[value],
                  }))}
                />
              </div>
            )}
          />
          <p className="text-xs text-muted-foreground">
            Mark it Important or Urgent only if it truly can&apos;t wait.
          </p>
        </section>
        ) : null}

        {scope !== "global" ? (
          <section className="grid gap-4 border-l-2 border-hairline pl-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">
                Country
              </Label>
              <Controller
                control={control}
                name="location.country"
                render={({ field }) => (
                  <SearchablePicker
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    placeholder="Choose a country"
                    searchPlaceholder="Search countries…"
                    items={COUNTRIES.map((value) => ({ value, label: value }))}
                  />
                )}
              />
              <FieldError message={errors.location?.country?.message} />
            </div>
            {scope === "city" ? (
              <div className="space-y-2">
                <Label
                  htmlFor="city"
                  className="text-sm font-semibold text-foreground"
                >
                  City or region
                </Label>
                <Input
                  id="city"
                  {...register("location.city")}
                  placeholder="e.g. Bengaluru"
                  className="h-11 rounded-md border-hairline px-3"
                />
                <FieldError message={errors.location?.city?.message} />
              </div>
            ) : null}
          </section>
        ) : null}

        {!isEditing ? (
          <ImageUploader
            value={images}
            onChange={setImages}
            folder="problems"
            className={compact ? "space-y-1.5" : undefined}
          />
        ) : null}
        <label className={cn("flex cursor-pointer items-start gap-3 py-1", compact && "gap-2.5 py-0.5")}>
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
          <span>
            <span className="block text-sm font-medium text-foreground">
              Post anonymously
            </span>
            <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
              Your name stays private; moderators can still keep the space safe.
            </span>
          </span>
        </label>
        {submitError ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
          >
            {submitError}
          </p>
        ) : null}
        {showPreview ? (
          <PreviewCard
            title={title}
            description={description}
            category={selectedCategory}
            priority={priority}
            isAnonymous={isAnonymous}
            viewer={viewer}
            images={images}
            onClose={() => setShowPreview(false)}
          />
        ) : null}
      </div>

      <div className={cn("mt-8 hidden items-center justify-between border-t border-hairline pt-4 sm:flex", compact && "mt-4 pt-3 lg:sticky lg:bottom-0 lg:z-10 lg:bg-background lg:pb-3")}>
        <CreditNote credits={credits} isEditing={isEditing} />
        <FormActions
          pending={pending}
          isEditing={isEditing}
          onCancel={onCancel}
          onPreview={() => setShowPreview((visible) => !visible)}
          previewVisible={showPreview}
          onSaveDraft={!isEditing ? saveDraft : undefined}
        />
      </div>
      {showMobileActions ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
          <div className="mx-auto flex max-w-[62rem] items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 flex-1 rounded-md"
              onClick={() => setShowPreview((visible) => !visible)}
              disabled={pending}
            >
              Preview
            </Button>
            <Button
              type="submit"
              size="lg"
              className="h-11 flex-[1.35]"
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Publishing…
                </>
              ) : (
                <>
                  Publish problem <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      ) : null}
      <SuggestCategoryDialog open={suggestOpen} onOpenChange={setSuggestOpen} />
    </form>
  );
}

function SearchablePicker({
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  items,
  invalid = false,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  items: { value: string; label: string; icon?: ReactNode }[];
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find((item) => item.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
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
              !selected && "text-muted-foreground",
            )}
          >
            {selected?.icon}
            {selected?.label ?? placeholder}
          </span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-1.5"
      >
        <Command>
          <CommandInput autoFocus placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>No matches found.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={`${item.label} ${item.value}`}
                  onSelect={() => {
                    onValueChange(item.value);
                    setOpen(false);
                  }}
                >
                  {item.icon}
                  {item.label}
                  {value === item.value ? (
                    <Check className="ml-auto size-4 text-primary" />
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  ) : null;
}
function CreditNote({
  credits,
  isEditing,
}: {
  credits: number;
  isEditing: boolean;
}) {
  return isEditing ? (
    <span />
  ) : (
    <p className="num text-xs text-muted-foreground">
      {credits} {credits === 1 ? "Credit" : "Credits"} left to post
    </p>
  );
}
function FormActions({
  pending,
  isEditing,
  onCancel,
  onPreview,
  previewVisible,
  onSaveDraft,
}: {
  pending: boolean;
  isEditing: boolean;
  onCancel?: () => void;
  onPreview: () => void;
  previewVisible: boolean;
  onSaveDraft?: () => void;
}) {
  return (
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
      {onSaveDraft ? (
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={onSaveDraft}
          disabled={pending}
        >
          Save draft
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="rounded-md"
        onClick={onPreview}
        disabled={pending}
      >
        {previewVisible ? "Keep writing" : "Preview"}
      </Button>
      <Button
        type="submit"
        size="lg"
        className="px-5"
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {isEditing ? "Saving…" : "Publishing…"}
          </>
        ) : isEditing ? (
          "Save changes"
        ) : (
          <>
            Publish problem <ArrowRight className="size-4" />
          </>
        )}
      </Button>
    </div>
  );
}
function PreviewCard({
  title,
  description,
  category,
  priority,
  isAnonymous,
  viewer,
  images,
  onClose,
}: {
  title: string;
  description: string;
  category?: CategoryDTO;
  priority: ProblemPriority;
  isAnonymous: boolean;
  viewer: { name: string; username: string; avatar?: string };
  images: ImageRef[];
  onClose: () => void;
}) {
  return (
    <section
      aria-label="Problem preview"
      className="border-t border-hairline pt-6"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="label text-muted-foreground">Preview</p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Keep writing
        </button>
      </div>
      <div className="space-y-3">
        {category ? (
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CategoryIcon name={category.icon} className="size-3" />
            {category.name}
          </p>
        ) : null}
        <h3 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-[-0.02em] text-foreground">
          <PriorityBadge priority={priority} />
          {title || "Untitled problem"}
        </h3>
        {description ? (
          <MarkdownContent className="text-sm">{description}</MarkdownContent>
        ) : (
          <p className="text-sm text-muted-foreground">
            Your details will appear here.
          </p>
        )}
        {images.length ? (
          <p className="text-xs text-muted-foreground">
            {images.length} image{images.length === 1 ? "" : "s"} attached
          </p>
        ) : null}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
        </div>
      </div>
    </section>
  );
}
