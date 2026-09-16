import { Schema, model, models, type Model, type Types } from "mongoose";

/** A private, one-per-user saved-problem relationship. */
export interface IProblemBookmark {
  _id: Types.ObjectId;
  problemId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
}

const ProblemBookmarkSchema = new Schema<IProblemBookmark>(
  {
    problemId: {
      type: Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ProblemBookmarkSchema.index({ problemId: 1, userId: 1 }, { unique: true });
ProblemBookmarkSchema.index({ userId: 1, createdAt: -1 });

export const ProblemBookmark: Model<IProblemBookmark> =
  (models.ProblemBookmark as Model<IProblemBookmark>) ||
  model<IProblemBookmark>("ProblemBookmark", ProblemBookmarkSchema);
