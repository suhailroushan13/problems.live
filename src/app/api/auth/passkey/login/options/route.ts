import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { env } from "@/lib/env";
import { PASSKEY_CHALLENGE_COOKIE, PASSKEY_CHALLENGE_MAX_AGE, passkeyConfig } from "@/lib/auth/passkeys";
export const dynamic = "force-dynamic";
export async function POST() {
  const { rpID } = passkeyConfig();
  const options = await generateAuthenticationOptions({ rpID, userVerification: "required" });
  const response = NextResponse.json(options);
  response.cookies.set(PASSKEY_CHALLENGE_COOKIE, options.challenge, { httpOnly: true, secure: env.isProduction, sameSite: "lax", path: "/", maxAge: PASSKEY_CHALLENGE_MAX_AGE });
  return response;
}
