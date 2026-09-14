import "server-only";
import { env } from "@/lib/env";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_POST,
} from "@/lib/constants";
import { LocalImageProvider } from "./providers/local";
import { VercelBlobImageProvider } from "./providers/vercel-blob";
import { CloudinaryImageProvider } from "./providers/cloudinary";
import type { ImageProvider, StoredImage } from "./types";

export type { StoredImage } from "./types";

/**
 * imageService — the storage seam. Switching providers is an env var, not a
 * refactor. Validation lives here so every caller gets the same guarantees.
 */
function resolveProvider(): ImageProvider {
  switch (env.imageProvider) {
    case "vercel-blob":
      return new VercelBlobImageProvider();
    case "cloudinary":
      return new CloudinaryImageProvider();
    case "local":
    default:
      return new LocalImageProvider();
  }
}

const globalForImage = globalThis as unknown as {
  __imageProvider?: ImageProvider;
};

function provider(): ImageProvider {
  if (!globalForImage.__imageProvider) {
    globalForImage.__imageProvider = resolveProvider();
  }
  return globalForImage.__imageProvider;
}

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageValidationError";
  }
}

/** Magic-number check — a renamed .exe must not pass as an image. */
const SIGNATURES: Array<{ type: string; test: (b: Uint8Array) => boolean }> = [
  { type: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    type: "image/png",
    test: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  { type: "image/gif", test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 },
  {
    type: "image/webp",
    test: (b) =>
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50,
  },
  {
    type: "image/avif",
    test: (b) =>
      b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70,
  },
];

async function assertRealImage(file: File): Promise<void> {
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const matched = SIGNATURES.some((s) => s.test(header));
  if (!matched) {
    throw new ImageValidationError(
      `"${file.name}" does not look like a real image file.`
    );
  }
}

export function validateImageFile(file: File): void {
  if (!(file instanceof File) || file.size === 0) {
    throw new ImageValidationError("That file could not be read.");
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    throw new ImageValidationError(
      `"${file.name}" is not a supported image. Use JPG, PNG, WebP, GIF or AVIF.`
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ImageValidationError(
      `"${file.name}" is larger than ${Math.round(
        MAX_IMAGE_BYTES / 1024 / 1024
      )}MB.`
    );
  }
}

export async function uploadImage(params: {
  file: File;
  folder: string;
  ownerId: string;
}): Promise<StoredImage> {
  validateImageFile(params.file);
  await assertRealImage(params.file);
  return provider().upload(params);
}

export async function uploadImages(params: {
  files: File[];
  folder: string;
  ownerId: string;
}): Promise<StoredImage[]> {
  const files = params.files.filter((f) => f && f.size > 0);
  if (files.length === 0) return [];
  if (files.length > MAX_IMAGES_PER_POST) {
    throw new ImageValidationError(
      `You can attach at most ${MAX_IMAGES_PER_POST} images.`
    );
  }

  const uploaded: StoredImage[] = [];
  for (const file of files) {
    uploaded.push(
      await uploadImage({ file, folder: params.folder, ownerId: params.ownerId })
    );
  }
  return uploaded;
}

export function optimizedImageUrl(url: string, width = 1200): string {
  return provider().optimizedUrl(url, width);
}
