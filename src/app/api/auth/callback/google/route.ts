import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { exchangeCodeForProfile } from "@/lib/auth/google";
import { hasInviteAccess } from "@/lib/auth/invite-access";
import { provisionUserFromGoogle } from "@/lib/auth/provision";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { connectToDatabase } from "@/lib/db/mongoose";
import { User, WaitlistEntry } from "@/models";

// Outer backstop: bounds what one stuck request can cost if an
// inner timeout is ever missed or raised.
export const maxDuration = 15;

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

function adminFailure(reason: string): NextResponse {
  return NextResponse.redirect(
    `${env.appUrl}/suhail/login?error=${encodeURIComponent(reason)}`,
  );
}

function waitlistFailure(): NextResponse {
  return NextResponse.redirect(`${env.appUrl}/wait-list?access=pending`);
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

    const next = request.cookies.get(NEXT_COOKIE)?.value ?? "/";
    const isSecretAdminLogin = next === "/suhail/complete";
    await connectToDatabase();
    const existingUser = await User.exists({
      $or: [{ googleId: profile.googleId }, { email: profile.email }],
    });
    if (isSecretAdminLogin) {
      const existingAdmin = await User.exists({
        email: profile.email,
        role: "admin",
      });
      if (!existingAdmin && !env.adminEmails.includes(profile.email)) {
        return clearOAuthCookies(adminFailure("not_authorized"));
      }
    }

    // Existing accounts keep access. First-time sign-ins require either an
    // explicit waitlist approval for the same verified Google email, or a
    // pending invite (email or personal link) that matches where they're
    // headed — a legitimate invite is its own approval.
    if (!existingUser && !env.adminEmails.includes(profile.email)) {
      const approved = await WaitlistEntry.exists({
        email: profile.email.toLowerCase(),
        status: "approved",
      });
      const invited = approved ? true : await hasInviteAccess(next, profile.email);
      if (!approved && !invited) return clearOAuthCookies(waitlistFailure());
    }

    const user = await provisionUserFromGoogle(profile);
    if (isSecretAdminLogin && user.role !== "admin") {
      return clearOAuthCookies(adminFailure("not_authorized"));
    }
    const token = await createSessionToken(String(user._id));

    const destination =
      next.startsWith("/") && !next.startsWith("//") ? next : "/";

    // /onboard immediately redirects to `next` for anyone who already has a
    // dateOfBirth on file, so this is a no-op hop for returning users and
    // only actually stops first-time/incomplete accounts.
    const redirectTarget = isSecretAdminLogin
      ? destination
      : `/onboard?next=${encodeURIComponent(destination)}`;
    const response = NextResponse.redirect(`${env.appUrl}${redirectTarget}`);
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
