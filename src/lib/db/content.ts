import "server-only";
import type { Types } from "mongoose";
import { Comment, Problem, Solution, User } from "@/models";

/**
 * Polymorphic access to the three user-content collections.
 *
 * Reports and moderation act on "a problem, a solution or a comment" without
 * caring which. Mongoose's `Model<T>` is invariant, so a single shared
 * `Model<...>` variable does not type-check across the three. Rather than
 * scatter casts through the action layer, every loose access is contained in
 * this one module behind a narrow, explicit interface.
 */

export type ContentTargetType = "problem" | "solution" | "comment";
export type ReportTargetType = ContentTargetType | "user";

/** The subset of the Mongoose Document API the moderation flows need. */
export interface ContentDocument {
  get(path: string): unknown;
  set(path: string, value: unknown): void;
  save(): Promise<unknown>;
}

export async function findContentDocument(
  type: ContentTargetType,
  id: Types.ObjectId
): Promise<ContentDocument | null> {
  switch (type) {
    case "problem":
      return Problem.findById(id).exec();
    case "solution":
      return Solution.findById(id).exec();
    case "comment":
      return Comment.findById(id).exec();
  }
}

/**
 * A lean document is a concrete interface, not an index-signature record, so
 * the one cast needed to read it generically lives here.
 */
function asRecord(doc: unknown): Record<string, unknown> | null {
  return doc ? (doc as Record<string, unknown>) : null;
}

/** Plain object for the target of a report, with the author populated. */
export async function findReportTarget(
  type: ReportTargetType,
  id: Types.ObjectId
): Promise<Record<string, unknown> | null> {
  switch (type) {
    case "problem":
      return asRecord(
        await Problem.findById(id).populate("authorId", "username").lean().exec()
      );
    case "solution":
      return asRecord(
        await Solution.findById(id).populate("authorId", "username").lean().exec()
      );
    case "comment":
      return asRecord(
        await Comment.findById(id).populate("authorId", "username").lean().exec()
      );
    case "user":
      return asRecord(await User.findById(id).lean().exec());
  }
}

export async function reportTargetExists(
  type: ReportTargetType,
  id: Types.ObjectId
): Promise<boolean> {
  switch (type) {
    case "problem":
      return Boolean(await Problem.exists({ _id: id }));
    case "solution":
      return Boolean(await Solution.exists({ _id: id }));
    case "comment":
      return Boolean(await Comment.exists({ _id: id }));
    case "user":
      return Boolean(await User.exists({ _id: id }));
  }
}

export async function setReportCount(
  type: ContentTargetType,
  id: Types.ObjectId,
  count: number
): Promise<void> {
  const update = { $set: { reportCount: count } };
  switch (type) {
    case "problem":
      await Problem.updateOne({ _id: id }, update).exec();
      return;
    case "solution":
      await Solution.updateOne({ _id: id }, update).exec();
      return;
    case "comment":
      await Comment.updateOne({ _id: id }, update).exec();
      return;
  }
}

/**
 * Hide content that has crossed the report threshold. It moves to `pending`
 * for human review — reports never delete anything on their own.
 */
export async function hideForReview(
  type: ContentTargetType,
  id: Types.ObjectId
): Promise<void> {
  const filter = { _id: id, moderationStatus: "approved" as const };
  const update = { $set: { moderationStatus: "pending" as const } };
  switch (type) {
    case "problem":
      await Problem.updateOne(filter, update).exec();
      return;
    case "solution":
      await Solution.updateOne(filter, update).exec();
      return;
    case "comment":
      await Comment.updateOne(filter, update).exec();
      return;
  }
}

export function isContentTarget(
  type: ReportTargetType
): type is ContentTargetType {
  return type !== "user";
}
