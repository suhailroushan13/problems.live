import { NextResponse, type NextRequest } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { buildAuthorizationUrl } from "@/lib/auth/google";
import { env } from "@/lib/env";

// Outer backstop: bounds what one stuck request can cost if an
// inner timeout is ever missed or raised.
export const maxDuration = 15;

export const dynamic = "force-dynamic";

const STATE_COOKIE = "pl_oauth_state";
const VERIFIER_COOKIE = "pl_oauth_verifier";
const NEXT_COOKIE = "pl_oauth_next";
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
    maxAge: TEN_MINUTES,
  };

  response.cookies.set(STATE_COOKIE, state, options);
  response.cookies.set(VERIFIER_COOKIE, codeVerifier, options);
  response.cookies.set(NEXT_COOKIE, next, options);

  return response;
}
