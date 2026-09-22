import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { exchangeCodeForProfile } from "@/lib/auth/google";
import { provisionUserFromGoogle } from "@/lib/auth/provision";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Invite, User } from "@/models";
import { hashInviteToken } from "@/lib/utils/invite-token";
import { inviteLinkCodeSchema, usernameSchema } from "@/lib/validation/schemas";

// Outer backstop: bounds what one stuck request can cost if an
// inner timeout is ever missed or raised.
export const maxDuration = 15;

export const dynamic = "force-dynamic";

const STATE_COOKIE_PREFIX = "pl_oauth_state_";
const VERIFIER_COOKIE_PREFIX = "pl_oauth_verifier_";
const NEXT_COOKIE_PREFIX = "pl_oauth_next_";
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

function clearOAuthCookies(response: NextResponse, attempt: string | null): NextResponse {
  const names = attempt
    ? [
        `${STATE_COOKIE_PREFIX}${attempt}`,
        `${VERIFIER_COOKIE_PREFIX}${attempt}`,
        `${NEXT_COOKIE_PREFIX}${attempt}`,
      ]
    : [];
  for (const name of names) {
    response.cookies.set(name, "", { path: "/", domain: env.cookieDomain, maxAge: 0 });
  }
  return response;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  if (params.get("error")) {
    return clearOAuthCookies(failure("cancelled"), null);
  }

  const code = params.get("code");
  const state = params.get("state");
  // Cookies are keyed by (a slice of) each attempt's own state, so concurrent
  // sign-in attempts — two tabs, a double click, a link-prefetching browser
  // extension — each get their own slot instead of clobbering a single
  // shared cookie name.
  const attempt = state ? state.slice(0, 16) : null;
  const expectedState = attempt
    ? request.cookies.get(`${STATE_COOKIE_PREFIX}${attempt}`)?.value
    : undefined;
  const codeVerifier = attempt
    ? request.cookies.get(`${VERIFIER_COOKIE_PREFIX}${attempt}`)?.value
    : undefined;

  // The state check is the CSRF defence for the whole flow — a callback that
  // does not match a state we issued is discarded before any token exchange.
  if (!code || !state || !expectedState || !codeVerifier) {
    return clearOAuthCookies(failure("invalid_request"), attempt);
  }
  if (!constantTimeEquals(state, expectedState)) {
    return clearOAuthCookies(failure("state_mismatch"), attempt);
  }

  try {
    const profile = await exchangeCodeForProfile({ code, codeVerifier });

    if (!profile.emailVerified) {
      return clearOAuthCookies(failure("email_unverified"), attempt);
    }

    const next = request.cookies.get(`${NEXT_COOKIE_PREFIX}${attempt}`)?.value ?? "/";
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
        return clearOAuthCookies(adminFailure("not_authorized"), attempt);
      }
    }

    const user = await provisionUserFromGoogle(profile);
    if (isSecretAdminLogin && user.role !== "admin") {
      return clearOAuthCookies(adminFailure("not_authorized"), attempt);
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

      if (!claimed) return clearOAuthCookies(failure("invite_unavailable"), attempt);

      await User.updateOne(
        { _id: user._id },
        { $set: { inviteCredits: 5, invitedBy: claimed.inviterId ?? null } },
        { strict: false },
      ).exec();
      destination = "/problems/new";
    }

    // Personal invitation links are accepted as part of the verified Google
    // sign-in. A recipient should never have to land on a second "accept"
    // screen after opening an invite link.
    const linkInvite = destination.match(/^\/invite\/link\/([^/]+)\/([^/]+)$/);
    if (linkInvite) {
      const inviterUsername = usernameSchema.safeParse(linkInvite[1]);
      const inviteCode = inviteLinkCodeSchema.safeParse(linkInvite[2]);
      if (!inviterUsername.success || !inviteCode.success) {
        return clearOAuthCookies(failure("invite_unavailable"), attempt);
      }

      const pendingInvite = await Invite.findOne(
        {
          tokenHash: hashInviteToken(inviteCode.data),
          type: "link",
          status: "pending",
          inviterUsername: inviterUsername.data,
          $expr: { $lt: [{ $ifNull: ["$usedCount", 0] }, { $ifNull: ["$maxUses", 1] }] },
        },
        { inviterId: 1 },
      ).lean().exec();

      if (!pendingInvite) return clearOAuthCookies(failure("invite_unavailable"), attempt);

      // Opening your own link is harmless: keep the account flowing to the
      // compose page without consuming one of your available invitations.
      const alreadyClaimed = pendingInvite.claimedByIds?.some(
        (claimantId) => String(claimantId) === String(user._id),
      );
      if (String(pendingInvite.inviterId) !== String(user._id) && !alreadyClaimed) {
        const claimTime = new Date();
        const claimed = await Invite.findOneAndUpdate(
          {
            _id: pendingInvite._id,
            status: "pending",
            claimedByIds: { $ne: user._id },
            $expr: { $lt: [{ $ifNull: ["$usedCount", 0] }, { $ifNull: ["$maxUses", 1] }] },
          },
          [
            {
              $set: {
                usedCount: { $add: [{ $ifNull: ["$usedCount", 0] }, 1] },
                claimedBy: user._id,
                claimedByIds: { $concatArrays: [{ $ifNull: ["$claimedByIds", []] }, [user._id]] },
                claimedAt: claimTime,
                status: {
                  $cond: [
                    {
                      $gte: [
                        { $add: [{ $ifNull: ["$usedCount", 0] }, 1] },
                        { $ifNull: ["$maxUses", 1] },
                      ],
                    },
                    "accepted",
                    "pending",
                  ],
                },
              },
            },
          ],
          { new: true },
        ).lean().exec();

        if (!claimed) return clearOAuthCookies(failure("invite_unavailable"), attempt);

        await User.updateOne(
          { _id: user._id },
          { $set: { inviteCredits: 5, invitedBy: claimed.inviterId ?? null } },
          { strict: false },
        ).exec();
      }

      destination = "/problems/new";
    }

    // Only a newly provisioned account needs first-run setup. Returning
    // admins go straight to their dashboard, including older admin records
    // that predate the explicit `onboardedAt` field.
    const redirectTarget = isSecretAdminLogin
      ? destination
      : user.role === "admin"
        ? "/admin"
        : existingUser
          ? destination
          : `/onboard?next=${encodeURIComponent(destination)}`;
    const response = NextResponse.redirect(`${env.appUrl}${redirectTarget}`);
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: "lax",
      path: "/",
      domain: env.cookieDomain,
      maxAge: SESSION_MAX_AGE,
    });

    return clearOAuthCookies(response, attempt);
  } catch (error) {
    console.error("[auth] Google callback failed", error);
    return clearOAuthCookies(failure("signin_failed"), attempt);
  }
}
