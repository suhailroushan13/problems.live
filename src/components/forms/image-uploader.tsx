"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGES_PER_POST,
  MAX_IMAGE_BYTES,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ImageRef } from "@/types";

/**
 * Client-side checks are for fast feedback only — the upload route re-validates
 * type, size and magic bytes before anything is stored.
 */
export function ImageUploader({
  value,
  onChange,
  folder,
  className,
}: {
  value: ImageRef[];
  onChange: (images: ImageRef[]) => void;
  folder: "problems" | "solutions";
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [dragging, setDragging] = useState(false);

  const remaining = MAX_IMAGES_PER_POST - value.length;

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList).slice(0, remaining);
    const rejected = files.find(
      (file) =>
        !ALLOWED_IMAGE_TYPES.includes(
          file.type as (typeof ALLOWED_IMAGE_TYPES)[number]
        ) || file.size > MAX_IMAGE_BYTES
    );

    if (rejected) {
      toast.error(
        `"${rejected.name}" must be a JPG, PNG, WebP, GIF or AVIF under ${Math.round(
          MAX_IMAGE_BYTES / 1024 / 1024
        )}MB.`
      );
      return;
    }

    const form = new FormData();
    form.append("folder", folder);
    for (const file of files) form.append("files", file);

    startTransition(async () => {
      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: form,
        });
        const data = (await response.json()) as {
          images?: ImageRef[];
          error?: string;
        };

        if (!response.ok || !data.images) {
          toast.error(data.error ?? "Upload failed.");
          return;
        }

        onChange([...value, ...data.images].slice(0, MAX_IMAGES_PER_POST));
      } catch {
        toast.error("Upload failed. Check your connection and try again.");
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  return (
    <div className={cn("space-y-2.5", className)}>
      {value.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((image) => (
            <div
              key={image.url}
              className="group relative aspect-square overflow-hidden rounded-lg border border-hairline bg-sunken"
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="160px"
                className="object-cover"
              />
              <button
                type="button"
                onClick={() =>
                  onChange(value.filter((item) => item.url !== image.url))
                }
                aria-label="Remove image"
                className="absolute top-1 right-1 rounded-full bg-background/85 p-1 text-foreground opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {remaining > 0 ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            handleFiles(event.dataTransfer.files);
          }}
          className={cn("flex items-center justify-between gap-3 rounded-lg border border-dashed px-3 py-2.5 transition-colors",
            dragging
              ? "border-brand-border bg-brand-muted/50"
              : "border-hairline bg-sunken/50"
          )}
        >
          <p className="text-xs text-muted-foreground">
            {pending ? "Uploading…" : `Add up to ${remaining} more image${remaining === 1 ? "" : "s"} — optional.`}
          </p>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            {pending ? (
              <Spinner className="size-3.5" />
            ) : (
              <ImagePlus className="size-3.5" />
            )}
            Upload
          </Button>

          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            multiple
            className="sr-only"
            onChange={(event) => handleFiles(event.target.files)}
          />
        </div>
      ) : null}
    </div>
  );
}
