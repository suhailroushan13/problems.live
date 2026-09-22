import { NextResponse, type NextRequest } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { buildAuthorizationUrl } from "@/lib/auth/google";
import { env } from "@/lib/env";

// Outer backstop: bounds what one stuck request can cost if an
// inner timeout is ever missed or raised.
export const maxDuration = 15;

export const dynamic = "force-dynamic";

const STATE_COOKIE_PREFIX = "pl_oauth_state_";
const VERIFIER_COOKIE_PREFIX = "pl_oauth_verifier_";
const NEXT_COOKIE_PREFIX = "pl_oauth_next_";
const TEN_MINUTES = 600;

function base64url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Only same-origin relative paths are accepted as a post-login destination,
 * so `?next=https://evil.example` cannot turn sign-in into an open redirect.
 */
function safeNext(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export async function GET(request: NextRequest) {
  const state = base64url(randomBytes(32));
  const codeVerifier = base64url(randomBytes(48));
  const codeChallenge = base64url(
    createHash("sha256").update(codeVerifier).digest()
  );

  const next = safeNext(request.nextUrl.searchParams.get("next"));

  const response = NextResponse.redirect(
    buildAuthorizationUrl({ state, codeChallenge })
  );

  const options = {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax" as const,
    path: "/",
    domain: env.cookieDomain,
    maxAge: TEN_MINUTES,
  };

  // Suffixing by (a slice of) this attempt's own state keeps concurrent
  // sign-in attempts — two tabs, a double click, a link-prefetching browser
  // extension — from clobbering each other's cookies. A single shared cookie
  // name would let a second attempt overwrite the first's state right before
  // the first's Google redirect comes back, producing a false state_mismatch.
  const attempt = state.slice(0, 16);
  response.cookies.set(`${STATE_COOKIE_PREFIX}${attempt}`, state, options);
  response.cookies.set(`${VERIFIER_COOKIE_PREFIX}${attempt}`, codeVerifier, options);
  response.cookies.set(`${NEXT_COOKIE_PREFIX}${attempt}`, next, options);

  return response;
}
