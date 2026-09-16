import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * One durable, anonymous record per browser. `lastSeenAt` doubles as the
 * presence heartbeat, while retaining the record makes the visit total
 * durable across deploys and restarts.
 */
export interface ISiteVisit {
  _id: Types.ObjectId;
  visitorId: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

const SiteVisitSchema = new Schema<ISiteVisit>(
  {
    visitorId: { type: String, required: true, unique: true },
    firstSeenAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true, index: true },
  },
  { versionKey: false }
);

export const SiteVisit: Model<ISiteVisit> =
  (models.SiteVisit as Model<ISiteVisit>) ||
  model<ISiteVisit>("SiteVisit", SiteVisitSchema);
