import { Schema, model, models, type Model } from "mongoose";

export interface IWaitlistEntry {
  name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  confirmationSentAt?: Date;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WaitlistEntrySchema = new Schema<IWaitlistEntry>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    confirmationSentAt: { type: Date },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
);

export const WaitlistEntry: Model<IWaitlistEntry> =
  (models.WaitlistEntry as Model<IWaitlistEntry>) ||
  model<IWaitlistEntry>("WaitlistEntry", WaitlistEntrySchema);
