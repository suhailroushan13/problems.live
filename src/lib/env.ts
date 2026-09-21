import "server-only";

/**
 * Server-only environment access. Nothing here may ever be imported from a
 * Client Component — `server-only` turns that into a build error.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example.`
    );
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

/**
 * Lazily read so that `next build` does not explode when secrets are absent on
 * the build machine — only request-time code paths need them.
 */
export const env = {
  get mongodbUri() {
    return required("MONGODB_URI");
  },
  get mongodbDbName() {
    return optional("MONGODB_DB", "problems_live");
  },
  get googleClientId() {
    return required("GOOGLE_CLIENT_ID");
  },
  get googleClientSecret() {
    return required("GOOGLE_CLIENT_SECRET");
  },
  get authSecret() {
    return required("AUTH_SECRET");
  },
  get appUrl() {
    const raw =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "") ||
      "http://localhost:3000";
    return raw.replace(/\/$/, "");
  },
  get imageProvider() {
    return optional("IMAGE_PROVIDER", "local") as
      | "local"
      | "vercel-blob"
      | "cloudinary";
  },
  get blobToken() {
    return optional("BLOB_READ_WRITE_TOKEN");
  },
  get cloudinaryCloudName() {
    return optional("CLOUDINARY_CLOUD_NAME");
  },
  get cloudinaryApiKey() {
    return optional("CLOUDINARY_API_KEY");
  },
  get cloudinaryApiSecret() {
    return optional("CLOUDINARY_API_SECRET");
  },
  get moderationProvider() {
    return optional("MODERATION_PROVIDER", "rules");
  },
  get adminEmails() {
    return optional("ADMIN_EMAILS")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  },
  get waitlistNotificationEmails() {
    return [...new Set(["suhailroushan13@gmail.com", ...this.adminEmails])];
  },
  get smtpUser() {
    return required("SMTP_USER");
  },
  get smtpPassword() {
    // Gmail app passwords may be displayed with spaces, but SMTP expects the
    // underlying contiguous value.
    return required("SMTP_PASSWORD").replaceAll(" ", "");
  },
  get legalMailingAddress() {
    return required("LEGAL_MAILING_ADDRESS");
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
};

export const APP_NAME = "problems.live";
export const APP_TAGLINE = "The internet's open list of problems worth solving.";
