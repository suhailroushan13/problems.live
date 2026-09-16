"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ImageEditorDialog } from "@/components/forms/image-editor-dialog";
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
  const [queue, setQueue] = useState<File[]>([]);
  const [editedFiles, setEditedFiles] = useState<File[]>([]);
  const [editingIndex, setEditingIndex] = useState(0);

  const remaining = MAX_IMAGES_PER_POST - value.length;

  function uploadFiles(files: File[]) {
    if (files.length === 0) return;
    const rejected = files.find(
      (file) =>
        !ALLOWED_IMAGE_TYPES.includes(
          file.type as (typeof ALLOWED_IMAGE_TYPES)[number],
        ) || file.size > MAX_IMAGE_BYTES,
    );

    if (rejected) {
      toast.error(
        `"${rejected.name}" must be a JPG, PNG, WebP, GIF or AVIF under ${Math.round(
          MAX_IMAGE_BYTES / 1024 / 1024,
        )}MB.`,
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

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).slice(0, remaining);
    const rejected = files.find(
      (file) =>
        !ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number]) ||
        file.size > MAX_IMAGE_BYTES,
    );
    if (rejected) {
      toast.error(`"${rejected.name}" must be a JPG, PNG, WebP, GIF or AVIF under ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setQueue(files);
    setEditedFiles([]);
    setEditingIndex(0);
  }

  function finishEditing(file: File) {
    const complete = [...editedFiles, file];
    if (editingIndex + 1 < queue.length) {
      setEditedFiles(complete);
      setEditingIndex((index) => index + 1);
      return;
    }
    setQueue([]);
    setEditedFiles([]);
    setEditingIndex(0);
    uploadFiles(complete);
  }

  function cancelEditing() {
    setQueue([]);
    setEditedFiles([]);
    setEditingIndex(0);
    if (inputRef.current) inputRef.current.value = "";
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
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending || queue.length > 0}
            onClick={() => inputRef.current?.click()}
            className="h-8 rounded-md px-2 text-muted-foreground hover:text-foreground"
          >
            {pending ? (
              <Spinner className="size-3.5" />
            ) : (
              <Plus className="size-3.5" />
            )}
            {pending ? "Uploading…" : "Add images"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Optional · up to {remaining} more
          </span>

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

      <ImageEditorDialog
        key={queue[editingIndex] ? `${queue[editingIndex].name}-${queue[editingIndex].lastModified}` : "empty"}
        file={queue[editingIndex] ?? null}
        open={queue.length > 0}
        position={editingIndex}
        total={queue.length}
        onOpenChange={(open) => { if (!open) cancelEditing(); }}
        onSave={finishEditing}
      />
    </div>
  );
}
