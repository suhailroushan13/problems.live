"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { connectToDatabase } from "@/lib/db/mongoose";
import { DomainError, isDuplicateKeyError, okVoid, toActionError } from "@/lib/action-helpers";
import { sendWaitlistConfirmation } from "@/lib/services/email";
import { waitlistSchema } from "@/lib/validation/schemas";
import { RateLimit, WaitlistEntry } from "@/models";
import type { ActionResult } from "@/types";

const WAITLIST_IP_LIMIT = 3;
const WAITLIST_IP_WINDOW_MS = 60_000;
const EXISTING_REQUEST_MESSAGE = "You’re already on the waitlist. Thanks for your double interest!";

async function enforceWaitlistIpLimit(): Promise<void> {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex");
  const windowStart = Math.floor(Date.now() / WAITLIST_IP_WINDOW_MS) * WAITLIST_IP_WINDOW_MS;
  const expiresAt = new Date(windowStart + WAITLIST_IP_WINDOW_MS);
  const key = `waitlist:ip:${ipHash}:${windowStart}`;

  const result = await RateLimit.findOneAndUpdate(
    { key },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean().exec();

  if ((result?.count ?? 1) > WAITLIST_IP_LIMIT) {
    throw new DomainError(
      "Too many waitlist requests from this connection. Please try again in a minute.",
      "rate_limited",
    );
  }
}

export async function joinWaitlist(raw: unknown): Promise<ActionResult> {
  try {
    const input = waitlistSchema.parse(raw);
    await connectToDatabase();
    await enforceWaitlistIpLimit();

    const existing = await WaitlistEntry.findOne(
      { email: input.email },
      { _id: 1, name: 1, confirmationSentAt: 1 },
    )
      .lean()
      .exec();
    if (existing) {
      if (!existing.confirmationSentAt) {
        try {
          await sendWaitlistConfirmation({ name: existing.name, email: input.email });
          await WaitlistEntry.updateOne(
            { _id: existing._id },
            { $set: { confirmationSentAt: new Date() } },
          ).exec();
        } catch (error) {
          console.error("[waitlist] confirmation email retry failed", error);
        }
      }
      return okVoid(EXISTING_REQUEST_MESSAGE);
    }

    try {
      await WaitlistEntry.create(input);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return okVoid(EXISTING_REQUEST_MESSAGE);
      }
      throw error;
    }
    try {
      await sendWaitlistConfirmation(input);
      await WaitlistEntry.updateOne(
        { email: input.email },
        { $set: { confirmationSentAt: new Date() } },
      ).exec();
    } catch (error) {
      // Do not make a successful waitlist request look unsuccessful when the
      // mail provider has a temporary problem. It can be safely resent later.
      console.error("[waitlist] confirmation email failed", error);
    }

    return okVoid("We received your request and will inform you soon.");
  } catch (error) {
    return toActionError(error);
  }
}
