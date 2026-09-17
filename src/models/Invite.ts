import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IInvite {
  email: string;
  name: string;
  tokenHash: string;
  inviterId?: Types.ObjectId | null;
  claimedBy?: Types.ObjectId | null;
  status: "pending" | "accepted";
  claimedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const InviteSchema = new Schema<IInvite>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    tokenHash: { type: String, required: true, unique: true },
    inviterId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    claimedBy: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    status: { type: String, enum: ["pending", "accepted"], default: "pending", index: true },
    claimedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

InviteSchema.index({ email: 1, status: 1 }, { unique: true, partialFilterExpression: { status: "pending" } });

export const Invite: Model<IInvite> =
  (models.Invite as Model<IInvite>) || model<IInvite>("Invite", InviteSchema);
