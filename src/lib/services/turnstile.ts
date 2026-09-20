import "server-only";
import { env } from "@/lib/env";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface SiteverifyResponse {
  success: boolean;
  "error-codes"?: string[];
}

/**
 * Server-side half of the Turnstile widget on /wait-list. The token from the
 * client is single-use and only proves the browser passed Cloudflare's
 * challenge — it must always be re-checked here, never trusted client-side.
 */
export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string,
): Promise<boolean> {
  if (!token) return false;

  const body = new URLSearchParams({
    secret: env.turnstileSecretKey,
    response: token,
  });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) return false;
    const data = (await response.json()) as SiteverifyResponse;
    if (!data.success) {
      console.warn("[turnstile] verification failed", data["error-codes"]);
    }
    return data.success === true;
  } catch (error) {
    console.error("[turnstile] verification request errored", error);
    return false;
  }
}
