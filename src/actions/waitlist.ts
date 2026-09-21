"use server";

import { headers } from "next/headers";
import { DomainError, fail, isDuplicateKeyError, okVoid, toActionError } from "@/lib/action-helpers";
import { connectToDatabase } from "@/lib/db/mongoose";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { waitlistJoinSchema } from "@/lib/validation/schemas";
import { verifyRenderProof } from "@/lib/utils/waitlist-proof";
import { verifyTurnstileToken } from "@/lib/services/turnstile";
import { sendWaitlistSignupNotification } from "@/lib/services/email";
import { User, WaitlistSignup } from "@/models";
import type { ActionResult } from "@/types";

const JOINED_MESSAGE = "We’ll email you when an invite becomes available.";

/**
 * Public and unauthenticated — this is the whole point of the waitlist. It
 * only records a lead; it never grants access, so it needs no session.
 *
 * Bot resistance is layered, cheapest first:
 *  1. `hpCheck` is a honeypot and fails silently, so scripts cannot learn its
 *     presence. The signed render-proof fails loudly: returning success before
 *     a database write would leave a real person believing they had joined.
 *  2. Cloudflare Turnstile — the one check a real visitor can trip by
 *     accident (an expired widget, a slow network), so it fails loudly with
 *     a real error the person can act on by retrying.
 *  3. Per-IP rate limit, checked only once the above pass, so a flood of bot
 *     traffic never touches the database or the limiter.
 */
export async function joinWaitlist(raw: unknown): Promise<ActionResult> {
  try {
    const input = waitlistJoinSchema.parse(raw);

    if (input.hpCheck.trim().length > 0) {
      return okVoid(JOINED_MESSAGE);
    }
    if (!verifyRenderProof(input.issuedAt, input.token)) {
      throw new DomainError("This form has expired. Refresh the page and try again.");
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

    try {
      await enforceRateLimit("waitlist:join", identifier);
      await connectToDatabase();
    } catch (error) {
      if (error instanceof RateLimitError) throw error;
      console.error("[waitlist] database or rate-limit infrastructure failed", error);
      return fail("We couldn’t join you to the waitlist right now. Please try again.");
    }

    let existingUser: unknown;
    let existingSignup: { status: "pending" | "approved" | "rejected" } | null;
    try {
      [existingUser, existingSignup] = await Promise.all([
        User.exists({ email: input.email }),
        WaitlistSignup.findOne({ email: input.email }).select("status").lean().exec(),
      ]);
    } catch (error) {
      console.error("[waitlist] lookup failed", error);
      return fail("We couldn’t join you to the waitlist right now. Please try again.");
    }
    if (existingUser) {
      throw new DomainError("You already have access to problems.live.");
    }
    if (existingSignup?.status === "pending") {
      return okVoid("Your access request is already pending.");
    }
    if (existingSignup?.status === "approved") {
      return okVoid("Your invitation is already being prepared. Please check your email soon.");
    }

    try {
      await WaitlistSignup.create({ name: input.name, email: input.email });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return okVoid("Your access request is already pending.");
      }
      console.error("[waitlist] signup creation failed", error);
      return fail("We couldn’t join you to the waitlist right now. Please try again.");
    }

    // Best-effort — a notification failure must not undo a successful signup.
    sendWaitlistSignupNotification({ name: input.name, email: input.email }).catch((error) => {
      console.error("[waitlist] admin notification failed", error);
    });

    return okVoid(JOINED_MESSAGE);
  } catch (error) {
    return toActionError(error);
  }
}
