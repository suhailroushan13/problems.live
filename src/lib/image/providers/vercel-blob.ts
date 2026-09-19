import "server-only";
import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";
import type { ImageProvider, StoredImage, UploadInput } from "../types";

/**
 * Vercel Blob via its REST API — avoids pulling in @vercel/blob for a single
 * PUT. Enable with IMAGE_PROVIDER=vercel-blob and BLOB_READ_WRITE_TOKEN.
 */
export class VercelBlobImageProvider implements ImageProvider {
  readonly name = "vercel-blob";

  async upload({ file, folder, ownerId }: UploadInput): Promise<StoredImage> {
    const token = env.blobToken;
    if (!token) throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const pathname = `${folder}/${ownerId.slice(-6)}-${randomUUID()}.${extension}`;

    const response = await fetch(
      `https://blob.vercel-storage.com/${encodeURI(pathname)}`,
      {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "x-api-version": "7",
          "x-content-type": file.type,
          "x-add-random-suffix": "0",
          "x-cache-control-max-age": "31536000",
        },
        signal: AbortSignal.timeout(20000),
        body: file,
      }
    );

    if (!response.ok) {
      throw new Error(`Blob upload failed with status ${response.status}`);
    }

    const data = (await response.json()) as { url: string; pathname: string };
    return { url: data.url, key: data.pathname };
  }

  optimizedUrl(url: string): string {
    return url;
  }
}
