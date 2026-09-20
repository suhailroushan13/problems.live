import { createHash } from "node:crypto";

/** Only the hash is ever persisted — the raw token/code is shown once, at creation. */
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
