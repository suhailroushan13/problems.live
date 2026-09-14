import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * Durable fixed-window counters. A TTL index reaps expired windows so the
 * collection never grows unbounded.
 */
export interface IRateLimit {
  _id: Types.ObjectId;
  key: string;
  count: number;
  expiresAt: Date;
}

const RateLimitSchema = new Schema<IRateLimit>({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});

RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimit: Model<IRateLimit> =
  (models.RateLimit as Model<IRateLimit>) ||
  model<IRateLimit>("RateLimit", RateLimitSchema);
