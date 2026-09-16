import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * An immutable record of a problem-card click. User IDs are retained whenever
 * the visitor is signed in; anonymous visitors are represented by the same
 * first-party browser ID used for live-presence tracking.
 */
export interface IProblemClick {
  _id: Types.ObjectId;
  problemId: Types.ObjectId;
  userId?: Types.ObjectId | null;
  visitorId: string;
  createdAt: Date;
}

const ProblemClickSchema = new Schema<IProblemClick>(
  {
    problemId: {
      type: Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    visitorId: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ProblemClickSchema.index({ problemId: 1, createdAt: -1 });
ProblemClickSchema.index({ visitorId: 1, createdAt: -1 });

export const ProblemClick: Model<IProblemClick> =
  (models.ProblemClick as Model<IProblemClick>) ||
  model<IProblemClick>("ProblemClick", ProblemClickSchema);
