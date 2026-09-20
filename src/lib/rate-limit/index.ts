import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import { RateLimit } from "@/models";
import { getSetting } from "@/lib/config/settings";

export type RateLimitAction =
  | "problem:create"
  | "comment:create"
  | "solution:create"
  | "report:create"
  | "vote"
  | "bookmark"
  | "problem:click"
  | "search"
  | "upload"
  | "category:suggest"
  | "username:check"
  | "username:generate"
  | "waitlist:join";

const SETTING_BY_ACTION = {
  "problem:create": "rateLimitProblemCreate",
  "comment:create": "rateLimitCommentCreate",
  "solution:create": "rateLimitSolutionCreate",
  "report:create": "rateLimitReportCreate",
  vote: "rateLimitVote",
  bookmark: "rateLimitBookmark",
  "problem:click": "rateLimitProblemClick",
  search: "rateLimitSearch",
  upload: "rateLimitUpload",
  "category:suggest": "rateLimitReportCreate",
  "username:check": "rateLimitUsernameCheck",
  "username:generate": "rateLimitUsernameCheck",
  "waitlist:join": "rateLimitWaitlistJoin",
} as const;

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super(
      `You're doing that a bit too fast. Try again in ${formatWait(
        retryAfterSeconds,
      )}.`,
    );
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function formatWait(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, seconds)} seconds`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

/**
 * Fixed-window counter backed by MongoDB, so limits survive restarts and hold
 * across serverless instances. One atomic upsert per check — no read-modify-
 * write race.
 */
export async function checkRateLimit(
  action: RateLimitAction,
  identifier: string,
): Promise<RateLimitResult> {
  const configured = (await getSetting(SETTING_BY_ACTION[action])) as
    readonly [number, number] | number[];
  const [limit, windowSeconds] = Array.isArray(configured)
    ? configured
    : [10, 3600];

  const windowMs = windowSeconds * 1000;
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const key = `${action}:${identifier}:${windowStart}`;
  const expiresAt = new Date(windowStart + windowMs);

  await connectToDatabase();

  const doc = await RateLimit.findOneAndUpdate(
    { key },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  )
    .lean()
    .exec();

  const count = doc?.count ?? 1;
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((windowStart + windowMs - Date.now()) / 1000),
  );

  return {
    ok: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds,
  };
}

/** Throwing variant for use inside Server Actions. */
export async function enforceRateLimit(
  action: RateLimitAction,
  identifier: string,
): Promise<void> {
  const result = await checkRateLimit(action, identifier);
  if (!result.ok) throw new RateLimitError(result.retryAfterSeconds);
}
