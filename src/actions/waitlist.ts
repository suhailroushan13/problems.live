"use server";

import { headers } from "next/headers";
import { DomainError, isDuplicateKeyError, okVoid, toActionError } from "@/lib/action-helpers";
import { connectToDatabase } from "@/lib/db/mongoose";
import { enforceRateLimit } from "@/lib/rate-limit";
import { waitlistJoinSchema } from "@/lib/validation/schemas";
import { verifyRenderProof } from "@/lib/utils/waitlist-proof";
import { verifyTurnstileToken } from "@/lib/services/turnstile";
import { WaitlistSignup } from "@/models";
import type { ActionResult } from "@/types";

const JOINED_MESSAGE = "You're on the list. We'll email you when an invite becomes available.";

/**
 * Public and unauthenticated — this is the whole point of the waitlist. It
 * only records a lead; it never grants access, so it needs no session.
 *
 * Bot resistance is layered, cheapest first:
 *  1. `company` honeypot and the signed render-proof are free local checks.
 *     Both fail silently with the normal success message — there's nothing
 *     for a script to learn from and tune against.
 *  2. Cloudflare Turnstile — the one check a real visitor can trip by
 *     accident (an expired widget, a slow network), so it fails loudly with
 *     a real error the person can act on by retrying.
 *  3. Per-IP rate limit, checked only once the above pass, so a flood of bot
 *     traffic never touches the database or the limiter.
 */
export async function joinWaitlist(raw: unknown): Promise<ActionResult> {
  try {
    const input = waitlistJoinSchema.parse(raw);

    if (input.company.trim().length > 0 || !verifyRenderProof(input.issuedAt, input.token)) {
      return okVoid(JOINED_MESSAGE);
    }

    const headerList = await headers();
    const identifier = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";

    const verified = await verifyTurnstileToken(
      input.turnstileToken,
      identifier !== "anonymous" ? identifier : undefined,
    );
    if (!verified) {
      throw new DomainError("Verification failed. Please try again.");
    }

    await enforceRateLimit("waitlist:join", identifier);
    await connectToDatabase();

    try {
      await WaitlistSignup.create({ name: input.name, email: input.email });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return okVoid("You're already on the list — we'll email you when an invite becomes available.");
      }
      throw error;
    }

    return okVoid(JOINED_MESSAGE);
  } catch (error) {
    return toActionError(error);
  }
}
