import { NextResponse, type NextRequest } from "next/server";
import { verifyRegistrationResponse, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { requireUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Passkey } from "@/models";
import { env } from "@/lib/env";
import { PASSKEY_CHALLENGE_COOKIE, passkeyConfig } from "@/lib/auth/passkeys";

// Outer backstop: bounds what one stuck request can cost if an
// inner timeout is ever missed or raised.
export const maxDuration = 15;

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const challenge = request.cookies.get(PASSKEY_CHALLENGE_COOKIE)?.value;
    if (!challenge) return NextResponse.json({ error: "Passkey setup expired. Try again." }, { status: 400 });
    const body = await request.json() as RegistrationResponseJSON;
    const { origins, rpID } = passkeyConfig();
    const verification = await verifyRegistrationResponse({ response: body, expectedChallenge: challenge, expectedOrigin: origins, expectedRPID: rpID, requireUserVerification: true });
    if (!verification.verified || !verification.registrationInfo) return NextResponse.json({ error: "We could not verify that passkey." }, { status: 400 });
    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    await connectToDatabase();
    await Passkey.create({ userId: user.id, credentialID: credential.id, publicKey: Buffer.from(credential.publicKey), counter: credential.counter, transports: body.response.transports ?? [], deviceType: credentialDeviceType, backedUp: credentialBackedUp });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(PASSKEY_CHALLENGE_COOKIE, "", { path: "/", domain: env.cookieDomain, maxAge: 0 });
    return response;
  } catch (error) {
    console.error("[passkey] registration verification failed", error);
    return NextResponse.json({ error: "We could not save that passkey. Try again." }, { status: 400 });
  }
}
