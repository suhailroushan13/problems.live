import "server-only";
import { env } from "@/lib/env";

export const PASSKEY_CHALLENGE_COOKIE = "pl_passkey_challenge";
export const PASSKEY_CHALLENGE_MAX_AGE = 300;

export function passkeyConfig() {
  const origin = env.appUrl;
  const rpID = new URL(origin).hostname;
  return { origin, rpID, rpName: "problems.live" };
}

export function safePasskeyNext(value: unknown) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/";
}
