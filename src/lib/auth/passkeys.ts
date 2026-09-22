import "server-only";
import { env } from "@/lib/env";

export const PASSKEY_CHALLENGE_COOKIE = "pl_passkey_challenge";
export const PASSKEY_CHALLENGE_MAX_AGE = 300;

export function passkeyConfig() {
  const origin = env.appUrl;
  const hostname = new URL(origin).hostname;
  const rpID = hostname.replace(/^www\./, "");
  // The two production aliases share an RP ID. Explicitly allow only both
  // canonical origins so passkey verification never trusts a Host header.
  const origins = new Set([origin]);
  if (rpID === "problems.live") {
    origins.add("https://problems.live");
    origins.add("https://www.problems.live");
  }
  return { origins: [...origins], rpID, rpName: "problems.live" };
}

export function safePasskeyNext(value: unknown) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/";
}
