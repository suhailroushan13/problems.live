"use client";

import Image from "next/image";
import { useState } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ImageRef } from "@/types";

export function PostImages({
  images,
  className,
}: {
  images: ImageRef[];
  className?: string;
}) {
  const [active, setActive] = useState<ImageRef | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <div
        className={cn("grid gap-2",
          images.length === 1 ? "grid-cols-1" : "grid-cols-2",
          className
        )}
      >
        {images.map((image) => (
          <button
            key={image.url}
            type="button"
            onClick={() => setActive(image)}
            className={cn("group relative overflow-hidden rounded-lg border border-hairline bg-sunken transition-opacity hover:opacity-92",
              images.length === 1 ? "aspect-16/9" : "aspect-4/3"
            )}
          >
            <Image
              src={image.url}
              alt={image.alt ?? ""}
              fill
              sizes="(max-width: 768px) 100vw, 640px"
              className="object-cover"
            />
          </button>
        ))}
      </div>

      <Dialog open={Boolean(active)} onOpenChange={() => setActive(null)}>
        <DialogContent
          showCloseButton={false}
          className="max-w-4xl border-0 bg-transparent p-0 shadow-none"
        >
          <DialogTitle className="sr-only">Image preview</DialogTitle>
          {active ? (
            <div className="relative">
              <Image
                src={active.url}
                alt={active.alt ?? ""}
                width={active.width ?? 1600}
                height={active.height ?? 1200}
                className="h-auto w-full rounded-lg object-contain"
              />
              <button
                type="button"
                onClick={() => setActive(null)}
                aria-label="Close image"
                className="absolute top-3 right-3 rounded-full bg-background/85 p-2 text-foreground backdrop-blur transition-colors hover:bg-background"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
