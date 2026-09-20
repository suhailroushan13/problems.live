import { Schema, model, models, type Model, type Types } from "mongoose";

export type WaitlistSignupStatus = "pending" | "approved" | "rejected";

/**
 * A lead captured from the invite-only access page. On its own this grants
 * nothing — approving one just creates a normal Invite (see actions/admin.ts
 * `approveWaitlistSignup`), so access is still controlled entirely by the
 * existing Invite flow.
 */
export interface IWaitlistSignup {
  _id: Types.ObjectId;
  name: string;
  email: string;
  status: WaitlistSignupStatus;
  respondedAt: Date | null;
  respondedBy: Types.ObjectId | null;
  createdAt: Date;
}

const WaitlistSignupSchema = new Schema<IWaitlistSignup>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 254 },
    status: { type: String, enum: ["pending", "approved", "rejected"], required: true, default: "pending" },
    respondedAt: { type: Date, default: null },
    respondedBy: { type: Schema.Types.ObjectId, default: null },
    createdAt: { type: Date, required: true, default: () => new Date() },
  },
  { versionKey: false }
);

WaitlistSignupSchema.index({ status: 1, createdAt: -1 });

export const WaitlistSignup: Model<IWaitlistSignup> =
  (models.WaitlistSignup as Model<IWaitlistSignup>) ||
  model<IWaitlistSignup>("WaitlistSignup", WaitlistSignupSchema);
