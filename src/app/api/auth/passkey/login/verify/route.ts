import { NextResponse, type NextRequest } from "next/server";
import { verifyAuthenticationResponse, type AuthenticationResponseJSON } from "@simplewebauthn/server";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Passkey, User } from "@/models";
import { env } from "@/lib/env";
import { PASSKEY_CHALLENGE_COOKIE, passkeyConfig, safePasskeyNext } from "@/lib/auth/passkeys";

// Outer backstop: bounds what one stuck request can cost if an
// inner timeout is ever missed or raised.
export const maxDuration = 15;
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const { response, next } = await request.json() as { response: AuthenticationResponseJSON; next?: string };
    const challenge = request.cookies.get(PASSKEY_CHALLENGE_COOKIE)?.value;
    if (!challenge) return NextResponse.json({ error: "Passkey sign-in expired. Try again." }, { status: 400 });
    await connectToDatabase();
    const credential = await Passkey.findOne({ credentialID: response.id }).exec();
    if (!credential) return NextResponse.json({ error: "That passkey is not registered here." }, { status: 401 });
    const { origins, rpID } = passkeyConfig();
    const verification = await verifyAuthenticationResponse({ response, expectedChallenge: challenge, expectedOrigin: origins, expectedRPID: rpID, requireUserVerification: true, credential: { id: credential.credentialID, publicKey: new Uint8Array(credential.publicKey), counter: credential.counter, transports: credential.transports } });
    if (!verification.verified) return NextResponse.json({ error: "We could not verify that passkey." }, { status: 401 });
    const user = await User.findById(credential.userId, { _id: 1, dateOfBirth: 1 }).lean().exec();
    if (!user) return NextResponse.json({ error: "This passkey's account no longer exists." }, { status: 401 });
    credential.counter = verification.authenticationInfo.newCounter;
    credential.deviceType = verification.authenticationInfo.credentialDeviceType;
    credential.backedUp = verification.authenticationInfo.credentialBackedUp;
    await credential.save();
    const destination = safePasskeyNext(next);
    const result = NextResponse.json({ ok: true, destination });
    result.cookies.set(SESSION_COOKIE, await createSessionToken(String(user._id)), { httpOnly: true, secure: env.isProduction, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
    result.cookies.set(PASSKEY_CHALLENGE_COOKIE, "", { path: "/", maxAge: 0 });
    return result;
  } catch (error) { console.error("[passkey] login verification failed", error); return NextResponse.json({ error: "Passkey sign-in failed. Try again." }, { status: 400 }); }
}
