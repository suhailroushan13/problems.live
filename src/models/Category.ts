import { Schema, model, models, type Model, type Types } from "mongoose";

export type CategoryStatus = "approved" | "pending" | "rejected" | "merged";

export interface ICategory {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  icon: string;
  status: CategoryStatus;
  mergedInto?: Types.ObjectId | null;
  problemCount: number;
  order: number;
  suggestedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, maxlength: 240 },
    icon: { type: String, default: "Shapes" },
    status: {
      type: String,
      enum: ["approved", "pending", "rejected", "merged"],
      default: "pending",
      index: true,
    },
    mergedInto: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    problemCount: { type: Number, default: 0 },
    order: { type: Number, default: 100 },
    suggestedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// Case-insensitive uniqueness guard against near-duplicate category names.
CategorySchema.index(
  { name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);
CategorySchema.index({ status: 1, order: 1, name: 1 });

export const Category: Model<ICategory> =
  (models.Category as Model<ICategory>) ||
  model<ICategory>("Category", CategorySchema);
