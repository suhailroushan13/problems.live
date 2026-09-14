import { Schema, model, models, type Model, type Types } from "mongoose";
import { USER_ROLES, type UserRole } from "@/lib/constants";

export interface UserStats {
  problems: number;
  solutions: number;
  comments: number;
  solvedProblems: number;
  helpfulVotes: number;
  validationsReceived: number;
}

export interface IUser {
  _id: Types.ObjectId;
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  username: string;
  /** Set the first time a user changes their username away from the one
   * they were provisioned with. Once set, further changes are refused —
   * a username may be changed exactly once. */
  usernameChangedAt?: Date | null;
  avatar?: string;
  bio?: string;
  role: UserRole;
  reputation: number;
  problemCredits: number;
  stats: UserStats;
  status: "active" | "suspended";
  suspendedUntil?: Date | null;
  suspensionReason?: string;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    googleId: { type: String, required: true, unique: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    emailVerified: { type: Boolean, default: false },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 2,
      maxlength: 30,
    },
    usernameChangedAt: { type: Date, default: null },
    avatar: { type: String },
    bio: { type: String, maxlength: 280 },
    role: { type: String, enum: USER_ROLES, default: "user", index: true },
    reputation: { type: Number, default: 0, index: true },
    problemCredits: { type: Number, default: 3 },
    stats: {
      problems: { type: Number, default: 0 },
      solutions: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      solvedProblems: { type: Number, default: 0 },
      helpfulVotes: { type: Number, default: 0 },
      validationsReceived: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
      index: true,
    },
    suspendedUntil: { type: Date, default: null },
    suspensionReason: { type: String },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

UserSchema.index({ reputation: -1, createdAt: -1 });
UserSchema.index({ "stats.helpfulVotes": -1 });
UserSchema.index({ "stats.solvedProblems": -1 });
UserSchema.index({ name: "text", username: "text" }, { name: "user_search" });

export const User: Model<IUser> =
  (models.User as Model<IUser>) || model<IUser>("User", UserSchema);
