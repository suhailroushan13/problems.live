import { Schema, model, models, type Model, type Types } from "mongoose";
import { NOTIFICATION_TYPES, type NotificationType } from "@/lib/constants";

export interface INotification {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  actorId?: Types.ObjectId | null;
  problemId?: Types.ObjectId | null;
  solutionId?: Types.ObjectId | null;
  commentId?: Types.ObjectId | null;
  message?: string;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    problemId: { type: Schema.Types.ObjectId, ref: "Problem", default: null },
    solutionId: { type: Schema.Types.ObjectId, ref: "Solution", default: null },
    commentId: { type: Schema.Types.ObjectId, ref: "Comment", default: null },
    message: { type: String, maxlength: 240 },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  (models.Notification as Model<INotification>) ||
  model<INotification>("Notification", NotificationSchema);
