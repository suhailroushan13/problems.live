import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * A lightweight "proof of render" for the public waitlist form. The page
 * issues a signed (issuedAt, token) pair at render time; a real visitor can
 * only submit one they actually received from us, and only after enough time
 * has passed to plausibly type a name and email. A script that posts
 * straight to the action without loading the page has no valid token at
 * all, and one that replays a fetched token still can't beat the minimum
 * fill time.
 */
const MIN_FILL_MS = 3_000;

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
  return elapsed >= MIN_FILL_MS && elapsed < 24 * 60 * 60 * 1000;
}
