/** Labels are provider-agnostic so the UI and thresholds never change. */
export const MODERATION_LABELS = [
  "profanity",
  "sexual",
  "harassment",
  "hate",
  "threat",
  "self_harm",
  "spam",
  "scam",
  "malicious_link",
  "personal_info",
  "low_quality",
] as const;

export type ModerationLabel = (typeof MODERATION_LABELS)[number];

export type ModerationAction = "allow" | "review" | "reject";

export interface ModerationInput {
  /** What is being checked — lets providers weight thresholds per surface. */
  kind: "problem" | "solution" | "comment" | "category";
  title?: string;
  body: string;
  /** Author trust signals; established users get fewer false positives. */
  authorReputation?: number;
  authorAgeDays?: number;
}

export interface ModerationResult {
  action: ModerationAction;
  /** 0 (clean) → 1 (certainly violating). */
  score: number;
  labels: ModerationLabel[];
  /** Human-readable explanation shown to the author when held or rejected. */
  reason?: string;
  provider: string;
}

export interface ModerationProvider {
  readonly name: string;
  check(input: ModerationInput): Promise<ModerationResult>;
}
