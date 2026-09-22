import { Schema, model, models, type Model, type Types } from "mongoose";

export type InviteType = "email" | "link";

export interface IInvite {
  /** "email" — sent to one address, single recipient. "link" — a shareable,
   * single-use personal URL keyed by the inviter's username + a code. */
  type: InviteType;
  email?: string;
  name?: string;
  tokenHash: string;
  inviterId?: Types.ObjectId | null;
  /** Denormalized inviter username at creation time, only set for "link"
   * invites — it's how `/invite/link/{username}/{code}` resolves an invite
   * without a join. */
  inviterUsername?: string;
  /** Link invites normally work once. Admins may make a reusable link. */
  maxUses: number;
  usedCount: number;
  claimedBy?: Types.ObjectId | null;
  /** Every account that joined through a reusable link, in claim order. */
  claimedByIds: Types.ObjectId[];
  status: "pending" | "accepted" | "cancelled";
  claimedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const InviteSchema = new Schema<IInvite>(
  {
    type: { type: String, enum: ["email", "link"], default: "email", index: true },
    email: { type: String, lowercase: true, trim: true, index: true },
    name: { type: String, trim: true, maxlength: 80 },
    tokenHash: { type: String, required: true, unique: true },
    inviterId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    inviterUsername: { type: String, lowercase: true, trim: true, index: true },
    maxUses: { type: Number, default: 1, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    claimedBy: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    claimedByIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    status: { type: String, enum: ["pending", "accepted", "cancelled"], default: "pending", index: true },
    claimedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Only email invites are constrained to one pending invite per address —
// link invites have no email at creation time, so they're excluded here.
InviteSchema.index(
  { email: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending", email: { $type: "string" } } },
);

export const Invite: Model<IInvite> =
  (models.Invite as Model<IInvite>) || model<IInvite>("Invite", InviteSchema);
