import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * A lightweight "proof of render" for the public waitlist form. The page
 * issues a signed (issuedAt, token) pair at render time; a real visitor can
 * only submit one they actually received from us. A script that posts straight
 * to the action without loading the page has no valid token at all. The proof
 * deliberately does not impose a minimum form-fill time: password managers and
 * browser autofill are legitimate and must not receive a false success state.
 */
const MAX_PROOF_AGE_MS = 24 * 60 * 60 * 1000;

function sign(issuedAt: number): string {
  return createHmac("sha256", env.authSecret).update(String(issuedAt)).digest("hex");
}

export function issueRenderProof(): { issuedAt: number; token: string } {
  const issuedAt = Date.now();
  return { issuedAt, token: sign(issuedAt) };
}

export function verifyRenderProof(issuedAt: number, token: string): boolean {
  if (!Number.isFinite(issuedAt) || !token) return false;

  const expected = Buffer.from(sign(issuedAt), "hex");
  const given = Buffer.from(token, "hex");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return false;
  }

  const elapsed = Date.now() - issuedAt;
  return elapsed >= 0 && elapsed < MAX_PROOF_AGE_MS;
}
