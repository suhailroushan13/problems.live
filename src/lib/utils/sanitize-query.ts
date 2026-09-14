import { Types } from "mongoose";

/**
 * Mongo query-injection guard. Any value that reaches a query filter from a
 * request must pass through one of these — never spread raw request objects
 * into a filter, or `{ "$ne": null }` becomes a valid "id".
 */

export function isValidObjectId(value: unknown): value is string {
  return typeof value === "string" && Types.ObjectId.isValid(value) && String(new Types.ObjectId(value)) === value;
}

/** Raised when a value that should already have been validated is not an id. */
export class InvalidObjectIdError extends Error {
  constructor() {
    super("We couldn't find that.");
    this.name = "InvalidObjectIdError";
  }
}

/**
 * Strict coercion for values that Zod has already validated as 24-hex ids.
 * Throwing here keeps `null` out of query filters entirely — a filter with a
 * null `_id` would otherwise silently match nothing (or, worse, everything).
 */
export function objectId(value: unknown): Types.ObjectId {
  const id = toObjectId(value);
  if (!id) throw new InvalidObjectIdError();
  return id;
}

export function toObjectId(value: unknown): Types.ObjectId | null {
  if (value instanceof Types.ObjectId) return value;
  if (typeof value !== "string" || !Types.ObjectId.isValid(value)) return null;
  return new Types.ObjectId(value);
}

/** Reject objects/arrays so operator payloads can never reach a filter. */
export function asScalarString(value: unknown, maxLength = 200): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

/** Strip `$`-prefixed and dotted keys from any object destined for Mongo. */
export function sanitizeObject<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeObject(item)) as T;
  }
  if (input && typeof input === "object" && !(input instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (key.startsWith("$") || key.includes(".")) continue;
      out[key] = sanitizeObject(value);
    }
    return out as T;
  }
  return input;
}
