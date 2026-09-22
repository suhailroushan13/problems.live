"use client";

import { useId, useRef, useState, useTransition, type KeyboardEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, Check, Dice5, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { updateAvatar } from "@/actions/auth";
import { AVATAR_STYLES, generatedAvatarUrl, type AvatarStyle, type AvatarType } from "@/lib/avatar";
import { MAX_IMAGE_BYTES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ImageEditorDialog } from "@/components/forms/image-editor-dialog";
import { cn } from "@/lib/utils";

const STYLE_LABELS: Record<AvatarStyle, string> = {
  people: "People",
  characters: "Characters",
  pixel: "Pixel",
  abstract: "Abstract",
  fun: "Fun",
};

const GENERATED_AVATARS_PER_STYLE = 21;
const AVATAR_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/**
 * Reusable profile-avatar picker. It owns its trigger today, while accepting
 * the complete persisted avatar state needed by settings and future edit flows.
 */
export function AvatarPickerModal({
  name,
  username,
  avatar,
  avatarType = "generated",
  avatarStyle = "people",
  avatarSeed,
  googleAvatarUrl,
  uploadedAvatarUrl,
  showLabel = false,
}: {
  name: string;
  username: string;
  avatar?: string;
  avatarType?: AvatarType;
  avatarStyle?: AvatarStyle;
  avatarSeed?: string;
  googleAvatarUrl?: string;
  uploadedAvatarUrl?: string;
  showLabel?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<AvatarType>(avatarType);
  const [selectedStyle, setSelectedStyle] = useState<AvatarStyle>(avatarStyle);
  const [activeStyle, setActiveStyle] = useState<AvatarStyle>(avatarStyle);
  const [selectedSeed, setSelectedSeed] = useState(avatarSeed ?? username);
  const [uploadedUrl, setUploadedUrl] = useState<string | undefined>(
    uploadedAvatarUrl ?? (avatarType === "uploaded" ? avatar : undefined)
  );
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [uploading, startUploading] = useTransition();
  const [saving, startSaving] = useTransition();
  const pickerId = useId();

  const generatedPreview = generatedAvatarUrl(selectedSeed, selectedStyle);
  const preview = selectedType === "generated"
    ? generatedPreview
    : selectedType === "uploaded"
      ? uploadedUrl ?? avatar
      : googleAvatarUrl;

  const avatarSeeds = Array.from(
    { length: GENERATED_AVATARS_PER_STYLE - 1 },
    (_, index) => `${username}-${activeStyle}-${index + 1}`,
  );
  if (!avatarSeeds.includes(selectedSeed)) avatarSeeds.unshift(selectedSeed);

  function resetSelection() {
    setSelectedType(avatarType);
    setSelectedStyle(avatarStyle);
    setActiveStyle(avatarStyle);
    setSelectedSeed(avatarSeed ?? username);
    setUploadedUrl(uploadedAvatarUrl ?? (avatarType === "uploaded" ? avatar : undefined));
  }

  function randomize() {
    const alternatives = avatarSeeds.filter((seed) => seed !== selectedSeed);
    const nextSeed = alternatives[Math.floor(Math.random() * alternatives.length)];
    setSelectedSeed(nextSeed ?? `${username}-${crypto.randomUUID()}`);
    setSelectedStyle(activeStyle);
    setSelectedType("generated");
  }

  function handleStyleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    const lastIndex = AVATAR_STYLES.length - 1;
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = Math.min(index + 1, lastIndex);
    if (event.key === "ArrowLeft") nextIndex = Math.max(index - 1, 0);
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = lastIndex;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextStyle = AVATAR_STYLES[nextIndex];
    setActiveStyle(nextStyle);
    document.getElementById(`${pickerId}-${nextStyle}-tab`)?.focus();
  }

  function handleAvatarKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    const columns = window.innerWidth >= 640 ? 7 : window.innerWidth >= 390 ? 5 : 4;
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = Math.min(index + 1, avatarSeeds.length - 1);
    if (event.key === "ArrowLeft") nextIndex = Math.max(index - 1, 0);
    if (event.key === "ArrowDown") nextIndex = Math.min(index + columns, avatarSeeds.length - 1);
    if (event.key === "ArrowUp") nextIndex = Math.max(index - columns, 0);
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = avatarSeeds.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    document.getElementById(`${pickerId}-${activeStyle}-avatar-${nextIndex}`)?.focus();
  }

  function uploadPhoto(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (
      !AVATAR_IMAGE_TYPES.includes(
        file.type as (typeof AVATAR_IMAGE_TYPES)[number],
      ) || file.size > MAX_IMAGE_BYTES
    ) {
      toast.error("Choose a JPG, PNG, or WebP image under 5MB.");
      return;
    }

    setPendingPhoto(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  function uploadEditedPhoto(file: File) {
    startUploading(async () => {
      const form = new FormData();
      form.append("folder", "avatars");
      form.append("files", file);
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const data = (await response.json()) as { images?: Array<{ url: string }>; error?: string };
      if (!response.ok || !data.images?.[0]?.url) {
        toast.error(data.error ?? "Upload failed.");
        return;
      }
      setUploadedUrl(data.images[0].url);
      setSelectedType("uploaded");
    });
  }

  function save() {
    startSaving(async () => {
      const result = await updateAvatar({
        avatarType: selectedType,
        avatarStyle: selectedStyle,
        avatarSeed: selectedSeed,
        avatarUrl: selectedType === "uploaded" ? uploadedUrl : undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Avatar updated.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetSelection();
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "group flex items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand/25",
            !showLabel && "relative shrink-0 rounded-full",
          )}
          aria-label="Change avatar"
        >
          <span className="relative shrink-0">
            <UserAvatar name={name} username={username} avatar={avatar} size="xl" />
            <span className="absolute right-0 bottom-0 flex size-6 items-center justify-center rounded-full bg-foreground text-background ring-2 ring-background transition-transform group-hover:scale-110">
              <Camera className="size-3" aria-hidden="true" />
            </span>
          </span>
          {showLabel ? (
            <span>
              <span className="block text-sm font-semibold text-foreground">Profile photo</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">Change avatar</span>
            </span>
          ) : null}
        </button>
      </DialogTrigger>

      <DialogContent showCloseButton={false} className="top-auto bottom-3 flex max-h-[calc(100dvh-1.5rem)] max-w-[calc(100%-1.5rem)] -translate-x-1/2 translate-y-0 flex-col gap-0 overflow-hidden rounded-[1.25rem] border-border/80 bg-background p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:top-1/2 sm:bottom-auto sm:max-h-[calc(100dvh-3rem)] sm:max-w-[40rem] sm:-translate-y-1/2 sm:rounded-[1.5rem] sm:p-7">
        <DialogClose asChild>
          <button
            type="button"
            className="absolute top-5 right-5 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-500/25 sm:top-6 sm:right-6"
            aria-label="Close avatar picker"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </DialogClose>
        <DialogHeader className="pr-8">
          <DialogTitle className="text-xl font-semibold tracking-[-0.02em]">Choose your avatar</DialogTitle>
          <DialogDescription className="text-[0.9375rem]">Make your profile yours.</DialogDescription>
        </DialogHeader>

        <div className="mt-5 flex items-center gap-3">
          <Image src={preview ?? generatedPreview} alt="Selected avatar" width={72} height={72} unoptimized referrerPolicy="no-referrer" className="size-16 rounded-full bg-sunken object-cover sm:size-[4.5rem]" />
          <div>
            <p className="font-semibold text-foreground">u/{username}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Current avatar</p>
          </div>
        </div>

        {googleAvatarUrl || uploadedUrl ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {googleAvatarUrl ? (
              <IdentityOption
                image={googleAvatarUrl}
                label="Google photo"
                selected={selectedType === "google"}
                onClick={() => setSelectedType("google")}
              />
            ) : null}
            {uploadedUrl ? (
              <IdentityOption
                image={uploadedUrl}
                label="Uploaded photo"
                selected={selectedType === "uploaded"}
                onClick={() => setSelectedType("uploaded")}
              />
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Illustrated avatars</p>
            <Button type="button" variant="ghost" size="sm" onClick={randomize} className="h-9 gap-1.5 px-2 text-muted-foreground">
              <Dice5 className="size-3.5" /> Randomize
            </Button>
          </div>
          <div
            role="tablist"
            aria-label="Generated avatar categories"
            className="mt-3 flex flex-wrap gap-x-1 gap-y-0.5"
          >
            {AVATAR_STYLES.map((style, index) => {
              return (
                <button
                  key={style}
                  id={`${pickerId}-${style}-tab`}
                  type="button"
                  role="tab"
                  aria-selected={activeStyle === style}
                  aria-controls={`${pickerId}-${style}-panel`}
                  onClick={() => setActiveStyle(style)}
                  onKeyDown={(event) => handleStyleKeyDown(event, index)}
                  className={cn(
                    "relative h-9 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-500/25",
                    activeStyle === style
                      ? "bg-blue-50 text-blue-700"
                      : "hover:bg-sunken hover:text-foreground"
                  )}
                >
                  {STYLE_LABELS[style]}
                </button>
              );
            })}
          </div>

          {activeStyle === "people" ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Happy, sad, angry, calm, and sleeping, shown through subtle expressions.
            </p>
          ) : null}

          <div
            id={`${pickerId}-${activeStyle}-panel`}
            role="tabpanel"
            aria-labelledby={`${pickerId}-${activeStyle}-tab`}
            className="mt-4 grid grid-cols-4 gap-3 min-[390px]:grid-cols-5 sm:grid-cols-7 sm:gap-3.5"
          >
            {avatarSeeds.map((seed, index) => {
              const selected =
                selectedType === "generated" &&
                selectedStyle === activeStyle &&
                selectedSeed === seed;

              return (
                <button
                  key={seed}
                  id={`${pickerId}-${activeStyle}-avatar-${index}`}
                  type="button"
                  onClick={() => {
                    setSelectedSeed(seed);
                    setSelectedStyle(activeStyle);
                    setSelectedType("generated");
                  }}
                  aria-label={`Select ${STYLE_LABELS[activeStyle]} avatar ${index + 1}`}
                  aria-pressed={selected}
                  onKeyDown={(event) => handleAvatarKeyDown(event, index)}
                  className={cn(
                    "relative mx-auto flex size-12 items-center justify-center rounded-full bg-slate-50 p-0.5 transition-all duration-150 hover:scale-[1.04] hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-500/25 sm:size-[3.75rem]",
                    selected && "bg-blue-50 ring-2 ring-blue-500 ring-offset-2 ring-offset-background"
                  )}
                >
                  <Image
                    src={generatedAvatarUrl(seed, activeStyle)}
                    alt=""
                    width={60}
                    height={60}
                    unoptimized
                    className="size-[2.75rem] rounded-full object-cover sm:size-[3.5rem]"
                  />
                  {selected ? (
                    <span className="absolute right-0 bottom-0 flex size-4 items-center justify-center rounded-full bg-blue-600 text-white ring-2 ring-background">
                      <Check className="size-2.5" strokeWidth={3} aria-hidden="true" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading || saving} className="h-10 gap-2 rounded-xl">
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Upload photo
            </Button>
            <span className="hidden sm:inline">or upload your own</span>
          </div>
          <div className="flex gap-2 sm:ml-auto">
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={saving || uploading} className="h-11 flex-1 rounded-xl sm:flex-none">Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={save} disabled={saving || uploading || !preview} className="h-11 flex-1 gap-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 sm:flex-none">
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save avatar
            </Button>
          </div>
          <input ref={inputRef} type="file" accept={AVATAR_IMAGE_TYPES.join(",")} className="sr-only" onChange={(event) => uploadPhoto(event.target.files)} />
        </div>
      </DialogContent>
      <ImageEditorDialog
        key={pendingPhoto ? `${pendingPhoto.name}-${pendingPhoto.lastModified}` : "empty"}
        file={pendingPhoto}
        open={Boolean(pendingPhoto)}
        position={0}
        total={1}
        shape="circle"
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingPhoto(null);
        }}
        onSave={(file) => {
          setPendingPhoto(null);
          uploadEditedPhoto(file);
        }}
      />
    </Dialog>
  );
}

function IdentityOption({
  image,
  label,
  selected,
  onClick,
}: {
  image: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sunken focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-500/25",
        selected && "bg-blue-50 text-blue-700",
      )}
    >
      <Image src={image} alt="" width={28} height={28} unoptimized referrerPolicy="no-referrer" className="size-7 rounded-full object-cover" />
      {label}
      {selected ? <Check className="size-3.5" aria-hidden="true" /> : null}
    </button>
  );
}

/** Backwards-compatible settings entry point. */
export const AvatarPicker = AvatarPickerModal;
