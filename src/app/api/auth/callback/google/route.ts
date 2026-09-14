import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { exchangeCodeForProfile } from "@/lib/auth/google";
import { provisionUserFromGoogle } from "@/lib/auth/provision";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "pl_oauth_state";
const VERIFIER_COOKIE = "pl_oauth_verifier";
const NEXT_COOKIE = "pl_oauth_next";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

function failure(reason: string): NextResponse {
  return NextResponse.redirect(
    `${env.appUrl}/?auth_error=${encodeURIComponent(reason)}`
  );
}

function clearOAuthCookies(response: NextResponse): NextResponse {
  for (const name of [STATE_COOKIE, VERIFIER_COOKIE, NEXT_COOKIE]) {
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
  return response;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  if (params.get("error")) {
    return clearOAuthCookies(failure("cancelled"));
  }

  const code = params.get("code");
  const state = params.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  const codeVerifier = request.cookies.get(VERIFIER_COOKIE)?.value;

  // The state check is the CSRF defence for the whole flow — a callback that
  // does not match a state we issued is discarded before any token exchange.
  if (!code || !state || !expectedState || !codeVerifier) {
    return clearOAuthCookies(failure("invalid_request"));
  }
  if (!constantTimeEquals(state, expectedState)) {
    return clearOAuthCookies(failure("state_mismatch"));
  }

  try {
    const profile = await exchangeCodeForProfile({ code, codeVerifier });

    if (!profile.emailVerified) {
      return clearOAuthCookies(failure("email_unverified"));
    }

    const user = await provisionUserFromGoogle(profile);
    const token = await createSessionToken(String(user._id));

    const next = request.cookies.get(NEXT_COOKIE)?.value ?? "/";
    const destination =
      next.startsWith("/") && !next.startsWith("//") ? next : "/";

    const response = NextResponse.redirect(`${env.appUrl}${destination}`);
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return clearOAuthCookies(response);
  } catch (error) {
    console.error("[auth] Google callback failed", error);
    return clearOAuthCookies(failure("signin_failed"));
  }
}
