import "server-only";
import { env } from "@/lib/env";
import { getSetting } from "@/lib/config/settings";
import { RulesModerationProvider } from "./providers/rules";
import type {
  ModerationInput,
  ModerationProvider,
  ModerationResult,
} from "./types";

export type {
  ModerationInput,
  ModerationResult,
  ModerationLabel,
  ModerationAction,
  ModerationProvider,
} from "./types";

/**
 * moderationService — the seam every write path goes through.
 *
 * Swapping in a hosted classifier (OpenAI moderations, Perspective, Hive,
 * a self-hosted model) means adding one file under `providers/` and one case
 * below. Nothing else in the app changes: callers only ever see
 * `{ action, score, labels }`.
 */
function resolveProvider(): ModerationProvider {
  switch (env.moderationProvider) {
    case "rules":
    default:
      return new RulesModerationProvider();
  }
}

const globalForModeration = globalThis as unknown as {
  __moderationProvider?: ModerationProvider;
};

function provider(): ModerationProvider {
  if (!globalForModeration.__moderationProvider) {
    globalForModeration.__moderationProvider = resolveProvider();
  }
  return globalForModeration.__moderationProvider;
}

export interface ModerationDecision extends ModerationResult {
  /** The persisted moderation state this decision maps to. */
  moderationStatus: "approved" | "pending" | "rejected";
  /** True when the author should be told their post is held for review. */
  held: boolean;
}

export async function moderateContent(
  input: ModerationInput
): Promise<ModerationDecision> {
  const [holdThreshold, rejectThreshold] = await Promise.all([
    getSetting("moderationHoldThreshold"),
    getSetting("moderationRejectThreshold"),
  ]);

  let result: ModerationResult;
  try {
    result = await provider().check(input);
  } catch {
    // A provider outage must not silently let everything through, nor block
    // the platform: hold for human review instead.
    return {
      action: "review",
      score: 0.5,
      labels: [],
      reason: "Automated review unavailable",
      provider: "fallback",
      moderationStatus: "pending",
      held: true,
    };
  }

  if (result.score >= rejectThreshold) {
    return { ...result, action: "reject", moderationStatus: "rejected", held: true };
  }
  if (result.score >= holdThreshold) {
    return { ...result, action: "review", moderationStatus: "pending", held: true };
  }
  return { ...result, action: "allow", moderationStatus: "approved", held: false };
}

/** Human-friendly explanation shown when content is held or rejected. */
export function moderationMessage(decision: ModerationDecision): string {
  if (decision.moderationStatus === "rejected") {
    return decision.reason
      ? `This can't be posted, our filters flagged it for ${decision.reason}. Please rewrite it and try again.`
      : "This can't be posted because it breaks the community guidelines.";
  }
  return "Posted, a moderator is reviewing it before it goes public. This usually takes a few minutes.";
}
