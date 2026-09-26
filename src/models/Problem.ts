import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  LOCATION_SCOPES,
  MODERATION_STATUSES,
  PROBLEM_PRIORITIES,
  PROBLEM_STATUSES,
  type LocationScope,
  type ModerationStatus,
  type ProblemPriority,
  type ProblemStatus,
} from "@/lib/constants";

export interface PostImage {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}

export interface ProblemLocation {
  scope: LocationScope;
  country?: string;
  region?: string;
  city?: string;
  label?: string;
}

export interface ModerationMeta {
  provider: string;
  score: number;
  labels: string[];
  reason?: string;
  reviewedBy?: Types.ObjectId | null;
  reviewedAt?: Date | null;
}

export interface IProblem {
  _id: Types.ObjectId;
  authorId: Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  categoryId: Types.ObjectId;
  location: ProblemLocation;
  images: PostImage[];
  isAnonymous: boolean;
  priority: ProblemPriority;
  status: ProblemStatus;
  moderationStatus: ModerationStatus;
  moderation: ModerationMeta;
  validationCount: number;
  /** Validation-count thresholds (see PROBLEM_VALIDATION_MILESTONES) already
   * notified for. Read-modify-write on `$addToSet` so a milestone fires
   * exactly once even under concurrent validations. */
  milestonesNotified: number[];
  bookmarkCount: number;
  commentCount: number;
  solutionCount: number;
  viewCount: number;
  reportCount: number;
  hotScore: number;
  featured: boolean;
  acceptedSolutionId?: Types.ObjectId | null;
  solvedAt?: Date | null;
  solvedBy?: Types.ObjectId | null;
  editedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Reddit-style logarithmic hot score. Monotonic in time, so it only has to be
 * recomputed when the underlying signal counts change — no cron, no drift.
 */
const HOT_EPOCH = 1_700_000_000; // seconds

export function computeHotScore(
  signal: number,
  createdAt: Date | number,
): number {
  const seconds = Math.floor(new Date(createdAt).getTime() / 1000) - HOT_EPOCH;
  const order = Math.log10(Math.max(Math.abs(signal), 1));
  return Number((order + seconds / 45000).toFixed(7));
}

/** Weighted engagement signal used to drive trending. */
export function problemSignal(p: {
  validationCount: number;
  solutionCount: number;
  commentCount: number;
}): number {
  return p.validationCount + p.solutionCount * 3 + p.commentCount;
}

const ImageSchema = new Schema<PostImage>(
  {
    url: { type: String, required: true },
    width: Number,
    height: Number,
    alt: { type: String, maxlength: 160 },
  },
  { _id: false },
);

const ModerationSchema = new Schema<ModerationMeta>(
  {
    provider: { type: String, default: "rules" },
    score: { type: Number, default: 0 },
    labels: { type: [String], default: [] },
    reason: String,
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
  },
  { _id: false },
);

const ProblemSchema = new Schema<IProblem>(
  {
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true, maxlength: 8000 },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    location: {
      scope: { type: String, enum: LOCATION_SCOPES, default: "global" },
      country: String,
      region: String,
      city: String,
      label: String,
    },
    images: { type: [ImageSchema], default: [] },
    isAnonymous: { type: Boolean, default: false },
    priority: {
      type: String,
      enum: PROBLEM_PRIORITIES,
      default: "normal",
    },
    status: {
      type: String,
      enum: PROBLEM_STATUSES,
      default: "open",
      index: true,
    },
    moderationStatus: {
      type: String,
      enum: MODERATION_STATUSES,
      default: "pending",
      index: true,
    },
    moderation: { type: ModerationSchema, default: () => ({}) },
    validationCount: { type: Number, default: 0 },
    milestonesNotified: { type: [Number], default: [] },
    bookmarkCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    solutionCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    reportCount: { type: Number, default: 0 },
    hotScore: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    acceptedSolutionId: {
      type: Schema.Types.ObjectId,
      ref: "Solution",
      default: null,
    },
    solvedAt: { type: Date, default: null },
    solvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Feed indexes: every sort in the explore UI is index-backed and prefixed by
// the visibility filter so we never scan removed/pending content.
ProblemSchema.index({ moderationStatus: 1, hotScore: -1 });
ProblemSchema.index({
  moderationStatus: 1,
  validationCount: -1,
  createdAt: -1,
});
ProblemSchema.index({ moderationStatus: 1, viewCount: -1, createdAt: -1 });
ProblemSchema.index({ moderationStatus: 1, createdAt: -1 });
ProblemSchema.index({ moderationStatus: 1, updatedAt: -1 });
ProblemSchema.index({ moderationStatus: 1, commentCount: -1, createdAt: -1 });
ProblemSchema.index({ moderationStatus: 1, solutionCount: -1, createdAt: -1 });
ProblemSchema.index({ categoryId: 1, moderationStatus: 1, hotScore: -1 });
ProblemSchema.index({ status: 1, moderationStatus: 1, hotScore: -1 });
ProblemSchema.index({ authorId: 1, createdAt: -1 });
ProblemSchema.index({
  "location.country": 1,
  moderationStatus: 1,
  hotScore: -1,
});
ProblemSchema.index({ featured: 1, moderationStatus: 1, hotScore: -1 });
ProblemSchema.index(
  { title: "text", description: "text" },
  { name: "problem_search", weights: { title: 10, description: 2 } },
);

export const Problem: Model<IProblem> =
  (models.Problem as Model<IProblem>) ||
  model<IProblem>("Problem", ProblemSchema);
