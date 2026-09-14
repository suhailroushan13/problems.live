import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { ImageProvider, StoredImage, UploadInput } from "../types";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/**
 * Filesystem provider for local development. Not suitable for serverless
 * production (ephemeral disk) — set IMAGE_PROVIDER to a hosted provider there.
 */
export class LocalImageProvider implements ImageProvider {
  readonly name = "local";

  async upload({ file, folder, ownerId }: UploadInput): Promise<StoredImage> {
    const extension = EXTENSION_BY_TYPE[file.type] ?? "bin";
    const dir = path.join(UPLOAD_ROOT, folder);
    await mkdir(dir, { recursive: true });

    const filename = `${ownerId.slice(-6)}-${randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buffer);

    return { url: `/uploads/${folder}/${filename}`, key: `${folder}/${filename}` };
  }

  optimizedUrl(url: string): string {
    // next/image handles resizing for local files.
    return url;
  }
}
