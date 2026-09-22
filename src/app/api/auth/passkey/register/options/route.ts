import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { requireUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Passkey } from "@/models";
import { env } from "@/lib/env";
import { PASSKEY_CHALLENGE_COOKIE, PASSKEY_CHALLENGE_MAX_AGE, passkeyConfig } from "@/lib/auth/passkeys";

// Outer backstop: bounds what one stuck request can cost if an
// inner timeout is ever missed or raised.
export const maxDuration = 15;

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await requireUser();
    await connectToDatabase();
    const existing = await Passkey.find({ userId: user.id }, { credentialID: 1, transports: 1 }).lean().exec();
    const { rpID, rpName } = passkeyConfig();
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: user.email,
      userDisplayName: user.name,
      userID: new TextEncoder().encode(user.id),
      attestationType: "none",
      excludeCredentials: existing.map((credential) => ({ id: credential.credentialID, transports: credential.transports })),
      authenticatorSelection: { residentKey: "required", userVerification: "required" },
    });
    const response = NextResponse.json(options);
    response.cookies.set(PASSKEY_CHALLENGE_COOKIE, options.challenge, {
      httpOnly: true, secure: env.isProduction, sameSite: "lax", path: "/", domain: env.cookieDomain, maxAge: PASSKEY_CHALLENGE_MAX_AGE,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Please sign in before adding a passkey." }, { status: 401 });
  }
}
