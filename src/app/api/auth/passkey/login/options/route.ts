import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { env } from "@/lib/env";
import { PASSKEY_CHALLENGE_COOKIE, PASSKEY_CHALLENGE_MAX_AGE, passkeyConfig } from "@/lib/auth/passkeys";

// Outer backstop: bounds what one stuck request can cost if an
// inner timeout is ever missed or raised.
export const maxDuration = 15;
export const dynamic = "force-dynamic";
export async function POST() {
  const { rpID } = passkeyConfig();
  const options = await generateAuthenticationOptions({ rpID, userVerification: "required" });
  const response = NextResponse.json(options);
  response.cookies.set(PASSKEY_CHALLENGE_COOKIE, options.challenge, { httpOnly: true, secure: env.isProduction, sameSite: "lax", path: "/", domain: env.cookieDomain, maxAge: PASSKEY_CHALLENGE_MAX_AGE });
  return response;
}
