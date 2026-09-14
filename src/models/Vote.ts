import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * Votes live in their own collections with unique compound indexes so that
 * "one vote per user" is enforced by the database, not by application logic.
 */

export interface IProblemValidation {
  _id: Types.ObjectId;
  problemId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
}

const ProblemValidationSchema = new Schema<IProblemValidation>(
  {
    problemId: { type: Schema.Types.ObjectId, ref: "Problem", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ProblemValidationSchema.index({ problemId: 1, userId: 1 }, { unique: true });
ProblemValidationSchema.index({ userId: 1, createdAt: -1 });

export const ProblemValidation: Model<IProblemValidation> =
  (models.ProblemValidation as Model<IProblemValidation>) ||
  model<IProblemValidation>("ProblemValidation", ProblemValidationSchema);

export interface ISolutionVote {
  _id: Types.ObjectId;
  solutionId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
}

const SolutionVoteSchema = new Schema<ISolutionVote>(
  {
    solutionId: {
      type: Schema.Types.ObjectId,
      ref: "Solution",
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

SolutionVoteSchema.index({ solutionId: 1, userId: 1 }, { unique: true });
SolutionVoteSchema.index({ userId: 1, createdAt: -1 });

export const SolutionVote: Model<ISolutionVote> =
  (models.SolutionVote as Model<ISolutionVote>) ||
  model<ISolutionVote>("SolutionVote", SolutionVoteSchema);

export interface ICommentVote {
  _id: Types.ObjectId;
  commentId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
}

const CommentVoteSchema = new Schema<ICommentVote>(
  {
    commentId: { type: Schema.Types.ObjectId, ref: "Comment", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

CommentVoteSchema.index({ commentId: 1, userId: 1 }, { unique: true });
CommentVoteSchema.index({ userId: 1, createdAt: -1 });

export const CommentVote: Model<ICommentVote> =
  (models.CommentVote as Model<ICommentVote>) ||
  model<ICommentVote>("CommentVote", CommentVoteSchema);
