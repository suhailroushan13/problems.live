import { Schema, model, models, type Model, type Types } from "mongoose";
import { REPORT_REASONS, type ReportReason } from "@/lib/constants";

export type ReportTargetType = "problem" | "solution" | "comment" | "user";
export type ReportStatus = "pending" | "reviewing" | "dismissed" | "actioned";

export interface IReport {
  _id: Types.ObjectId;
  reporterId: Types.ObjectId;
  targetType: ReportTargetType;
  targetId: Types.ObjectId;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  resolvedBy?: Types.ObjectId | null;
  resolvedAt?: Date | null;
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["problem", "solution", "comment", "user"],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, maxlength: 1000 },
    status: {
      type: String,
      enum: ["pending", "reviewing", "dismissed", "actioned"],
      default: "pending",
      index: true,
    },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
    resolution: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

// One report per user per target — repeat reports are noise, not signal.
ReportSchema.index(
  { reporterId: 1, targetType: 1, targetId: 1 },
  { unique: true }
);
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ targetType: 1, targetId: 1, status: 1 });

export const Report: Model<IReport> =
  (models.Report as Model<IReport>) || model<IReport>("Report", ReportSchema);
