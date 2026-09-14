export interface StoredImage {
  url: string;
  width?: number;
  height?: number;
  /** Provider-specific handle, kept so deletes can be implemented later. */
  key?: string;
}

export interface UploadInput {
  file: File;
  /** Logical folder, e.g. `problems` or `solutions`. */
  folder: string;
  /** Used to namespace uploads per user. */
  ownerId: string;
}

export interface ImageProvider {
  readonly name: string;
  upload(input: UploadInput): Promise<StoredImage>;
  /** Optimised delivery URL. Providers without transforms return the original. */
  optimizedUrl(url: string, width: number): string;
}
