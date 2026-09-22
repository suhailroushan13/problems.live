import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { exchangeCodeForProfile } from "@/lib/auth/google";
import { hasInviteAccess } from "@/lib/auth/invite-access";
import { provisionUserFromGoogle } from "@/lib/auth/provision";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Invite, User } from "@/models";
import { hashInviteToken } from "@/lib/utils/invite-token";

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

const PENDING_PROFILE_COOKIE = "pl_pending_profile";

/**
 * Carries the name/email this person just proved ownership of over to the
 * waitlist form, so they don't have to retype what Google already gave us.
 * A short-lived, httpOnly cookie — never a query string — since it's PII.
 */
function noAccessFailure(profile: { name: string; email: string }): NextResponse {
  const response = NextResponse.redirect(`${env.appUrl}/wait-list?access=pending`);
  response.cookies.set(
    PENDING_PROFILE_COOKIE,
    JSON.stringify({ name: profile.name, email: profile.email }),
    {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: "lax",
      path: "/wait-list",
      maxAge: 300,
    },
  );
  return response;
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

    // Existing accounts keep access. First-time sign-ins require a pending
    // invite (email or personal link) that matches where they're headed —
    // access is invite-only, granted directly by an admin or by someone
    // spending one of their own invite credits.
    if (!existingUser && !env.adminEmails.includes(profile.email)) {
      const invited = await hasInviteAccess(next, profile.email);
      if (!invited) return clearOAuthCookies(noAccessFailure(profile));
    }

    const user = await provisionUserFromGoogle(profile);
    if (isSecretAdminLogin && user.role !== "admin") {
      return clearOAuthCookies(adminFailure("not_authorized"));
    }
    const token = await createSessionToken(String(user._id));

    let destination =
      next.startsWith("/") && !next.startsWith("//") ? next : "/";

    // Consume email invitations before account setup. Previously onboarding
    // preserved `/invite/<token>` as its destination, so users could finish
    // setup and return to a one-time URL that had already become unavailable.
    // Claiming here gives the new account its invite credits and makes the
    // post-onboarding destination deterministic.
    const emailInvite = destination.match(/^\/invite\/([A-Za-z0-9_-]{20,128})$/);
    if (emailInvite) {
      const claimed = await Invite.findOneAndUpdate(
        {
          tokenHash: hashInviteToken(emailInvite[1]),
          type: "email",
          status: "pending",
          email: profile.email,
        },
        { $set: { status: "accepted", claimedBy: user._id, claimedAt: new Date() } },
        { new: true },
      ).lean().exec();

      if (!claimed) return clearOAuthCookies(failure("invite_unavailable"));

      await User.updateOne(
        { _id: user._id },
        { $set: { inviteCredits: 5, invitedBy: claimed.inviterId ?? null } },
        { strict: false },
      ).exec();
      destination = "/problems/new";
    }

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
