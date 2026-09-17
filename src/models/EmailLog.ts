import { Schema, model, models, type Model } from "mongoose";

export interface IEmailLog {
  recipient: string;
  subject: string;
  text: string;
  html: string;
  status: "sent" | "failed";
  providerMessageId?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmailLogSchema = new Schema<IEmailLog>(
  {
    recipient: { type: String, required: true, lowercase: true, trim: true, index: true },
    subject: { type: String, required: true, maxlength: 200 },
    text: { type: String, required: true, maxlength: 20_000 },
    html: { type: String, required: true, maxlength: 50_000 },
    status: { type: String, enum: ["sent", "failed"], required: true, index: true },
    providerMessageId: { type: String, maxlength: 500 },
    errorMessage: { type: String, maxlength: 2_000 },
  },
  { timestamps: true },
);

EmailLogSchema.index({ createdAt: -1 });

export const EmailLog: Model<IEmailLog> =
  (models.EmailLog as Model<IEmailLog>) || model<IEmailLog>("EmailLog", EmailLogSchema);
