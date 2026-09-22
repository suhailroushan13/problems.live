import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { exchangeCodeForProfile } from "@/lib/auth/google";
import { hasInviteAccess } from "@/lib/auth/invite-access";
import { provisionUserFromGoogle } from "@/lib/auth/provision";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Invite, User, WaitlistSignup } from "@/models";
import { hashInviteToken } from "@/lib/utils/invite-token";
import { inviteLinkCodeSchema, usernameSchema } from "@/lib/validation/schemas";
import { sendWaitlistSignupNotification } from "@/lib/services/email";

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

/**
 * Google has already verified this email, so a first access attempt can join
 * the waitlist immediately. This avoids asking someone to submit the same
 * name and email for a second time after they choose to post a problem.
 */
async function joinVerifiedWaitlist(profile: { name: string; email: string }): Promise<void> {
  const email = profile.email.toLowerCase();
  const existingSignup = await WaitlistSignup.findOne({ email })
    .select("status")
    .lean()
    .exec();

  if (existingSignup?.status === "pending") return;

  if (existingSignup?.status === "approved") {
    const hasLiveInvite = await Invite.exists({ email, status: "pending" });
    if (hasLiveInvite) return;
  }

  let shouldNotify = false;
  if (existingSignup) {
    const result = await WaitlistSignup.updateOne(
      { email, status: existingSignup.status },
      {
        $set: {
          name: profile.name,
          status: "pending",
          respondedAt: null,
          respondedBy: null,
          createdAt: new Date(),
        },
      },
    ).exec();
    shouldNotify = result.matchedCount > 0;
  } else {
    try {
      await WaitlistSignup.create({ name: profile.name, email });
      shouldNotify = true;
    } catch (error) {
      // A simultaneous callback for the same verified address has already
      // created its record. Treat that as success instead of failing OAuth.
      if (!(error instanceof Error) || !error.message.includes("E11000")) throw error;
    }
  }

  if (!shouldNotify) return;

  // A notification problem must never make the verified person repeat this
  // access flow. Their waitlist record is already safely stored.
  try {
    await sendWaitlistSignupNotification({ name: profile.name, email });
  } catch (error) {
    console.error("[auth] waitlist notification failed", error);
  }
}

async function noAccessFailure(profile: { name: string; email: string }): Promise<NextResponse> {
  await joinVerifiedWaitlist(profile);
  return NextResponse.redirect(`${env.appUrl}/wait-list?access=joined`);
}

function clearOAuthCookies(response: NextResponse): NextResponse {
  for (const name of [STATE_COOKIE, VERIFIER_COOKIE, NEXT_COOKIE]) {
    response.cookies.set(name, "", { path: "/", domain: env.cookieDomain, maxAge: 0 });
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
      if (!invited) return clearOAuthCookies(await noAccessFailure(profile));
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

    // Personal invitation links are accepted as part of the verified Google
    // sign-in. A recipient should never have to land on a second "accept"
    // screen after opening an invite link.
    const linkInvite = destination.match(/^\/invite\/link\/([^/]+)\/([^/]+)$/);
    if (linkInvite) {
      const inviterUsername = usernameSchema.safeParse(linkInvite[1]);
      const inviteCode = inviteLinkCodeSchema.safeParse(linkInvite[2]);
      if (!inviterUsername.success || !inviteCode.success) {
        return clearOAuthCookies(failure("invite_unavailable"));
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

      if (!pendingInvite) return clearOAuthCookies(failure("invite_unavailable"));

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

        if (!claimed) return clearOAuthCookies(failure("invite_unavailable"));

        await User.updateOne(
          { _id: user._id },
          { $set: { inviteCredits: 5, invitedBy: claimed.inviterId ?? null } },
          { strict: false },
        ).exec();
      }

      destination = "/problems/new";
    }

    // /onboard immediately redirects to `next` for anyone whose setup is
    // already complete, so this is a no-op hop for returning users and
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
      domain: env.cookieDomain,
      maxAge: SESSION_MAX_AGE,
    });

    return clearOAuthCookies(response);
  } catch (error) {
    console.error("[auth] Google callback failed", error);
    return clearOAuthCookies(failure("signin_failed"));
  }
}
