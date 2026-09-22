"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Crop, FlipHorizontal, RotateCcw, RotateCw } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const OUTPUT_SIZE = 1600;

function renderEditedFile({
  file,
  image,
  zoom,
  rotation,
  flipX,
  offset,
  previewSize,
}: {
  file: File;
  image: HTMLImageElement;
  zoom: number;
  rotation: number;
  flipX: boolean;
  offset: { x: number; y: number };
  previewSize: number;
}): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new Error("Could not prepare this image."));

  const cover = Math.max(OUTPUT_SIZE / image.naturalWidth, OUTPUT_SIZE / image.naturalHeight);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  context.translate(OUTPUT_SIZE / 2 + (offset.x / previewSize) * OUTPUT_SIZE, OUTPUT_SIZE / 2 + (offset.y / previewSize) * OUTPUT_SIZE);
  context.rotate((rotation * Math.PI) / 180);
  context.scale(flipX ? -zoom : zoom, zoom);
  context.drawImage(image, -image.naturalWidth * cover / 2, -image.naturalHeight * cover / 2, image.naturalWidth * cover, image.naturalHeight * cover);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Could not save this image."));
      const name = file.name.replace(/\.[^.]+$/, "") || "image";
      resolve(new File([blob], `${name}-edited.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  });
}

export function ImageEditorDialog({
  file,
  open,
  position,
  total,
  shape = "square",
  onOpenChange,
  onSave,
}: {
  file: File | null;
  open: boolean;
  position: number;
  total: number;
  /** Avatar uploads use the same editor, with a circular visual crop. */
  shape?: "square" | "circle";
  onOpenChange: (open: boolean) => void;
  onSave: (file: File) => void;
}) {
  // Callers key this dialog by file identity, so this local URL is freshly
  // created for each selected image and safely released when it closes.
  const [src] = useState<string | null>(() => file ? URL.createObjectURL(file) : null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!image) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    setOffset({
      x: dragStart.current.offsetX + event.clientX - dragStart.current.x,
      y: dragStart.current.offsetY + event.clientY - dragStart.current.y,
    });
  }

  function stopDragging() { dragStart.current = null; }

  async function save() {
    if (!file || !image || !previewRef.current) return;
    setSaving(true);
    try {
      const size = previewRef.current.getBoundingClientRect().width;
      onSave(await renderEditedFile({ file, image, zoom, rotation, flipX, offset, previewSize: size }));
    } catch {
      toast.error("Couldn’t prepare this image. Try another photo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94dvh] overflow-y-auto p-5 sm:max-w-lg sm:p-6" showCloseButton={!saving}>
        <DialogHeader className="text-left">
          <DialogTitle>Adjust photo{total > 1 ? ` ${position + 1} of ${total}` : ""}</DialogTitle>
          <DialogDescription>
            Drag to position your photo, then adjust its zoom, angle, or flip before uploading.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={previewRef}
          className={cn(
            "relative mx-auto aspect-square w-full max-w-[clamp(15rem,calc(100dvh-27rem),32rem)] touch-none overflow-hidden bg-foreground",
            shape === "circle" ? "rounded-full" : "rounded-lg",
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
        >
          {src ? (
            // A blob URL is local-only and must use a native image element.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt="Crop preview"
              draggable={false}
              onLoad={(event) => setImage(event.currentTarget)}
              className="absolute inset-0 size-full max-w-none select-none object-cover"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${flipX ? -zoom : zoom}, ${zoom})`,
              }}
            />
          ) : null}
          <div className="pointer-events-none absolute inset-0 border border-white/70" aria-hidden="true" />
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between"><Label htmlFor="photo-zoom">Zoom</Label><span className="num text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span></div>
            <input id="photo-zoom" aria-label="Zoom photo" type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="w-full accent-primary" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between"><Label htmlFor="photo-angle">Straighten</Label><span className="num text-xs text-muted-foreground">{rotation}°</span></div>
            <input id="photo-angle" aria-label="Straighten photo" type="range" min="-45" max="45" step="1" value={rotation} onChange={(event) => setRotation(Number(event.target.value))} className="w-full accent-primary" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setRotation((value) => Math.max(-180, value - 90))}><RotateCcw className="size-3.5" /> Rotate left</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setRotation((value) => Math.min(180, value + 90))}><RotateCw className="size-3.5" /> Rotate right</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setFlipX((value) => !value)} aria-pressed={flipX}><FlipHorizontal className="size-3.5" /> Flip</Button>
            <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => { setZoom(1); setRotation(0); setFlipX(false); setOffset({ x: 0, y: 0 }); }}><Crop className="size-3.5" /> Reset</Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button type="button" onClick={() => void save()} disabled={!image || saving}>{saving ? "Preparing…" : "Use this photo"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
