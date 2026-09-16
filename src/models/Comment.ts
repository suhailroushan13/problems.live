import { Schema, model, models, type Model, type Types } from "mongoose";
import { MODERATION_STATUSES, type ModerationStatus } from "@/lib/constants";
import type { ModerationMeta } from "./Problem";

export type CommentStatus = "visible" | "deleted";

export interface IComment {
  _id: Types.ObjectId;
  problemId: Types.ObjectId;
  solutionId?: Types.ObjectId | null;
  authorId: Types.ObjectId;
  parentId?: Types.ObjectId | null;
  content: string;
  isAnonymous: boolean;
  status: CommentStatus;
  moderationStatus: ModerationStatus;
  moderation: ModerationMeta;
  helpfulCount: number;
  awardCount: number;
  replyCount: number;
  reportCount: number;
  editedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

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

const CommentSchema = new Schema<IComment>(
  {
    problemId: {
      type: Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
      index: true,
    },
    solutionId: {
      type: Schema.Types.ObjectId,
      ref: "Solution",
      default: null,
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },
    content: { type: String, required: true, maxlength: 4000 },
    isAnonymous: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["visible", "deleted"],
      default: "visible",
    },
    moderationStatus: {
      type: String,
      enum: MODERATION_STATUSES,
      default: "pending",
      index: true,
    },
    moderation: { type: ModerationSchema, default: () => ({}) },
    helpfulCount: { type: Number, default: 0 },
    awardCount: { type: Number, default: 0 },
    replyCount: { type: Number, default: 0 },
    reportCount: { type: Number, default: 0 },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

CommentSchema.index({ problemId: 1, parentId: 1, createdAt: 1 });
CommentSchema.index({ problemId: 1, moderationStatus: 1, createdAt: -1 });
CommentSchema.index({ solutionId: 1, moderationStatus: 1, createdAt: 1 });
CommentSchema.index({ authorId: 1, createdAt: -1 });
CommentSchema.index({ moderationStatus: 1, createdAt: -1 });

export const Comment: Model<IComment> =
  (models.Comment as Model<IComment>) ||
  model<IComment>("Comment", CommentSchema);
