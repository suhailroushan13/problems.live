import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  ACCOUNT_GENDERS,
  SOCIAL_PLATFORMS,
  USER_ROLES,
  type AccountGender,
  type LocationScope,
  type SocialLinks,
  type UserRole,
} from "@/lib/constants";
import type { AvatarStyle, AvatarType } from "@/lib/avatar";

export interface UserStats {
  problems: number;
  solutions: number;
  comments: number;
  solvedProblems: number;
  helpfulVotes: number;
  validationsReceived: number;
}

export interface UserDefaultLocation {
  scope: LocationScope;
  country?: string;
  region?: string;
  city?: string;
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
  /** Set once, by the user, and never changed after that, so it stays a
   * reliable value rather than something people can edit at will. */
  dateOfBirth?: Date | null;
  /** Marks completion of the one-time profile setup without collecting DOB. */
  onboardedAt?: Date | null;
  avatar?: string;
  avatarType?: AvatarType;
  avatarStyle?: AvatarStyle;
  avatarSeed?: string;
  avatarUrl?: string;
  googleAvatarUrl?: string;
  bio?: string;
  socialLinks?: SocialLinks;
  /** Private account preferences. They are deliberately excluded from public DTOs. */
  phone?: string;
  gender: AccountGender;
  defaultLocation: UserDefaultLocation;
  role: UserRole;
  reputation: number;
  problemCredits: number;
  inviteCredits: number;
  invitedBy?: Types.ObjectId | null;
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
    dateOfBirth: { type: Date, default: null },
    onboardedAt: { type: Date, default: null },
    avatar: { type: String },
    avatarType: { type: String, enum: ["google", "generated", "uploaded"], default: "generated" },
    avatarStyle: { type: String, enum: ["people", "characters", "pixel", "abstract", "fun"], default: "people" },
    avatarSeed: { type: String },
    avatarUrl: { type: String },
    googleAvatarUrl: { type: String },
    bio: { type: String, maxlength: 500 },
    socialLinks: Object.fromEntries(
      SOCIAL_PLATFORMS.map((platform) => [
        platform.key,
        { type: String, maxlength: platform.maxLength },
      ])
    ),
    phone: { type: String, trim: true, maxlength: 24 },
    gender: {
      type: String,
      enum: ACCOUNT_GENDERS,
      default: "not_specified",
    },
    defaultLocation: {
      scope: { type: String, enum: ["global", "country", "city"], default: "global" },
      country: { type: String, trim: true, maxlength: 60 },
      region: { type: String, trim: true, maxlength: 80 },
      city: { type: String, trim: true, maxlength: 80 },
    },
    role: { type: String, enum: USER_ROLES, default: "user", index: true },
    reputation: { type: Number, default: 0, index: true },
    problemCredits: { type: Number, default: 10 },
    inviteCredits: { type: Number, default: 0, min: 0 },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
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
