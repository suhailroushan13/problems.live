import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "@/lib/env";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

const jwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

export function googleRedirectUri(): string {
  return `${env.appUrl}/api/auth/callback/google`;
}

export function buildAuthorizationUrl(params: {
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", env.googleClientId);
  url.searchParams.set("redirect_uri", googleRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

interface GoogleTokenResponse {
  id_token?: string;
  access_token?: string;
  error?: string;
  error_description?: string;
}

export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
}

export async function exchangeCodeForProfile(params: {
  code: string;
  codeVerifier: string;
}): Promise<GoogleProfile> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: params.code,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
      code_verifier: params.codeVerifier,
    }),
    cache: "no-store",
    // A stalled token exchange holds the OAuth callback open for the whole
    // platform limit; the caller would rather surface a login error fast.
    signal: AbortSignal.timeout(10000),
  });

  const data = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !data.id_token) {
    throw new Error(
      `Google token exchange failed: ${data.error ?? response.status}`
    );
  }

  // Verifying the ID token signature against Google's JWKS is what makes the
  // rest of this trustworthy — never decode-without-verify.
  const { payload } = await jwtVerify(data.id_token, jwks, {
    issuer: GOOGLE_ISSUERS,
    audience: env.googleClientId,
  });

  const email = typeof payload.email === "string" ? payload.email : "";
  if (!email) throw new Error("Google account did not return an email address.");

  return {
    googleId: String(payload.sub),
    email: email.toLowerCase(),
    emailVerified: payload.email_verified === true,
    name:
      (typeof payload.name === "string" && payload.name.trim()) ||
      email.split("@")[0],
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
  };
}
