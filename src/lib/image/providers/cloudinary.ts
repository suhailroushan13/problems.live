import "server-only";
import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import type { ImageProvider, StoredImage, UploadInput } from "../types";

/**
 * Cloudinary signed upload. Enable with IMAGE_PROVIDER=cloudinary plus the
 * three CLOUDINARY_* variables.
 */
export class CloudinaryImageProvider implements ImageProvider {
  readonly name = "cloudinary";

  async upload({ file, folder }: UploadInput): Promise<StoredImage> {
    const cloudName = env.cloudinaryCloudName;
    const apiKey = env.cloudinaryApiKey;
    const apiSecret = env.cloudinaryApiSecret;
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Cloudinary credentials are not configured.");
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const assetFolder = `problems-live/${folder}`;
    const signature = createHash("sha1")
      .update(`folder=${assetFolder}&timestamp=${timestamp}${apiSecret}`)
      .digest("hex");

    const body = new FormData();
    body.append("file", file);
    body.append("api_key", apiKey);
    body.append("timestamp", String(timestamp));
    body.append("folder", assetFolder);
    body.append("signature", signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      // Uploads are user-initiated and retryable; hanging on a slow Cloudinary
      // is more expensive than failing and letting the user try again.
      { method: "POST", body, signal: AbortSignal.timeout(20000) }
    );

    if (!response.ok) {
      throw new Error(`Cloudinary upload failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
      secure_url: string;
      public_id: string;
      width?: number;
      height?: number;
    };

    return {
      url: data.secure_url,
      key: data.public_id,
      width: data.width,
      height: data.height,
    };
  }

  optimizedUrl(url: string, width: number): string {
    return url.replace(
      "/upload/",
      `/upload/f_auto,q_auto,c_limit,w_${Math.round(width)}/`
    );
  }
}
