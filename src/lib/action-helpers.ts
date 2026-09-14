import { ZodError } from "zod";
import { AuthError, ForbiddenError } from "@/lib/auth/current-user";
import { RateLimitError } from "@/lib/rate-limit";
import { InvalidObjectIdError } from "@/lib/utils/sanitize-query";
import type { ActionErrorCode, ActionResult } from "@/types";

/**
 * Server Actions must not leak stack traces to the browser. Every action
 * returns a discriminated `ActionResult` instead of throwing, and this maps
 * known internal errors onto safe, human messages.
 *
 * This file deliberately has no "use server" directive — such files may only
 * export async functions, and these helpers are plain synchronous utilities.
 */

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

export function okVoid(message?: string): ActionResult<undefined> {
  return { ok: true, data: undefined, message };
}

export function fail(
  error: string,
  code: ActionErrorCode = "server_error",
  fieldErrors?: Record<string, string[]>
): ActionResult<never> {
  return { ok: false, error, code, fieldErrors };
}

export class DomainError extends Error {
  readonly code: ActionErrorCode;
  constructor(message: string, code: ActionErrorCode = "validation") {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}

export class NotFoundError extends DomainError {
  constructor(message = "We couldn't find that.") {
    super(message, "not_found");
    this.name = "NotFoundError";
  }
}

export function toActionError(error: unknown): ActionResult<never> {
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "form";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    const first = error.issues[0]?.message ?? "Please check the form.";
    return fail(first, "validation", fieldErrors);
  }

  if (error instanceof AuthError) return fail(error.message, "unauthenticated");
  if (error instanceof ForbiddenError) return fail(error.message, "forbidden");
  if (error instanceof RateLimitError) return fail(error.message, "rate_limited");
  if (error instanceof InvalidObjectIdError) {
    return fail(error.message, "not_found");
  }
  if (error instanceof DomainError) return fail(error.message, error.code);

  // Anything unexpected is logged server-side and generalised for the client.
  console.error("[action] unhandled error", error);
  return fail("Something went wrong on our side. Please try again.", "server_error");
}

/** Mongo duplicate-key errors surface as code 11000. */
export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}
