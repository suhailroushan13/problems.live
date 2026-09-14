import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * Runtime-tunable platform knobs. Anything an operator might want to change
 * without a deploy (credits, rate limits, moderation thresholds) lives here
 * rather than in code.
 */
export interface ISetting {
  _id: Types.ObjectId;
  key: string;
  value: unknown;
  description?: string;
  updatedBy?: Types.ObjectId | null;
  updatedAt: Date;
  createdAt: Date;
}

const SettingSchema = new Schema<ISetting>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export const Setting: Model<ISetting> =
  (models.Setting as Model<ISetting>) ||
  model<ISetting>("Setting", SettingSchema);
