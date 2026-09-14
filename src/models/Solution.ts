import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  MODERATION_STATUSES,
  SOLUTION_STATUSES,
  type ModerationStatus,
  type SolutionStatus,
} from "@/lib/constants";
import type { ModerationMeta, PostImage } from "./Problem";

export interface ISolution {
  _id: Types.ObjectId;
  problemId: Types.ObjectId;
  authorId: Types.ObjectId;
  title: string;
  description: string;
  url?: string;
  images: PostImage[];
  isAnonymous: boolean;
  helpfulCount: number;
  commentCount: number;
  reportCount: number;
  hotScore: number;
  status: SolutionStatus;
  moderationStatus: ModerationStatus;
  moderation: ModerationMeta;
  editedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ImageSchema = new Schema<PostImage>(
  {
    url: { type: String, required: true },
    width: Number,
    height: Number,
    alt: { type: String, maxlength: 160 },
  },
  { _id: false }
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
  { _id: false }
);

const SolutionSchema = new Schema<ISolution>(
  {
    problemId: {
      type: Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, required: true, maxlength: 6000 },
    url: { type: String, maxlength: 500 },
    images: { type: [ImageSchema], default: [] },
    isAnonymous: { type: Boolean, default: false },
    helpfulCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    reportCount: { type: Number, default: 0 },
    hotScore: { type: Number, default: 0 },
    status: {
      type: String,
      enum: SOLUTION_STATUSES,
      default: "proposed",
      index: true,
    },
    moderationStatus: {
      type: String,
      enum: MODERATION_STATUSES,
      default: "pending",
      index: true,
    },
    moderation: { type: ModerationSchema, default: () => ({}) },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

SolutionSchema.index({ problemId: 1, moderationStatus: 1, helpfulCount: -1 });
SolutionSchema.index({ problemId: 1, moderationStatus: 1, createdAt: -1 });
SolutionSchema.index({ problemId: 1, moderationStatus: 1, hotScore: -1 });
SolutionSchema.index({ moderationStatus: 1, helpfulCount: -1, createdAt: -1 });
SolutionSchema.index({ moderationStatus: 1, createdAt: -1 });
SolutionSchema.index({ authorId: 1, createdAt: -1 });
SolutionSchema.index(
  { title: "text", description: "text" },
  { name: "solution_search", weights: { title: 10, description: 2 } }
);

export const Solution: Model<ISolution> =
  (models.Solution as Model<ISolution>) ||
  model<ISolution>("Solution", SolutionSchema);
