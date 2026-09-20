import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Setting } from "@/models";

/**
 * Platform knobs with code defaults and database overrides. Operators tune
 * these from /admin/settings without a deploy; nothing here is hardcoded at a
 * call site.
 */
export const SETTING_DEFAULTS = {
  /** Credits granted to a brand new account. */
  startingProblemCredits: 10,
  /** Credits refunded/earned when a problem attracts real validation. */
  creditsPerValidatedProblem: 1,
  /** Validations a problem needs before it earns its author a credit back. */
  validationsToEarnCredit: 10,
  /** Max credits an account can bank. */
  maxProblemCredits: 25,
  /** Reputation needed before a user may suggest new categories. */
  reputationToSuggestCategory: 25,
  /** Reputation needed before reports count toward auto-hide thresholds. */
  reputationToReport: 0,
  /** Distinct reports before content is auto-hidden pending review. */
  reportsToAutoHide: 4,
  /** Moderation score (0-1) at or above which content is held for review. */
  moderationHoldThreshold: 0.5,
  /** Moderation score at or above which content is rejected outright. */
  moderationRejectThreshold: 0.85,
  /** Similarity (0-1) above which we warn about a possible duplicate. */
  duplicateSimilarityThreshold: 0.32,

  // Rate limits — [max actions, window in seconds]
  rateLimitProblemCreate: [5, 3600],
  rateLimitCommentCreate: [20, 600],
  rateLimitSolutionCreate: [10, 3600],
  rateLimitReportCreate: [10, 3600],
  rateLimitVote: [120, 600],
  rateLimitBookmark: [120, 600],
  rateLimitProblemClick: [300, 600],
  rateLimitSearch: [60, 60],
  rateLimitUpload: [30, 3600],
  rateLimitUsernameCheck: [30, 60],
  rateLimitWaitlistJoin: [3, 3600],
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type SettingValue<K extends SettingKey> = (typeof SETTING_DEFAULTS)[K];

type CacheEntry = { value: unknown; expiresAt: number };

const globalForSettings = globalThis as unknown as {
  __settingsCache?: Map<string, CacheEntry>;
};
const cache =
  globalForSettings.__settingsCache ?? new Map<string, CacheEntry>();
globalForSettings.__settingsCache = cache;

const TTL_MS = 60_000;

export async function getSetting<K extends SettingKey>(
  key: K,
): Promise<SettingValue<K>> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as SettingValue<K>;
  }

  let value: unknown = SETTING_DEFAULTS[key];
  try {
    await connectToDatabase();
    const doc = await Setting.findOne({ key }).lean().exec();
    if (doc && doc.value !== undefined && doc.value !== null) value = doc.value;
  } catch {
    // A settings lookup must never take down a request — fall back to defaults.
  }

  cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
  return value as SettingValue<K>;
}

export async function getSettings(): Promise<Record<SettingKey, unknown>> {
  await connectToDatabase();
  const docs = await Setting.find({}).lean().exec();
  const overrides = new Map(docs.map((d) => [d.key, d.value]));

  const out = {} as Record<SettingKey, unknown>;
  for (const key of Object.keys(SETTING_DEFAULTS) as SettingKey[]) {
    out[key] = overrides.has(key) ? overrides.get(key) : SETTING_DEFAULTS[key];
  }
  return out;
}

export async function setSetting(
  key: SettingKey,
  value: unknown,
  updatedBy?: string,
): Promise<void> {
  await connectToDatabase();
  await Setting.findOneAndUpdate(
    { key },
    { $set: { value, updatedBy: updatedBy ?? null } },
    { upsert: true },
  ).exec();
  cache.delete(key);
}

export function invalidateSettingsCache(): void {
  cache.clear();
}
