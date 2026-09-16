import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IPasskey {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  credentialID: string;
  publicKey: Buffer;
  counter: number;
  transports: string[];
  deviceType: "singleDevice" | "multiDevice";
  backedUp: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PasskeySchema = new Schema<IPasskey>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  credentialID: { type: String, required: true, unique: true },
  publicKey: { type: Buffer, required: true },
  counter: { type: Number, required: true },
  transports: { type: [String], default: [] },
  deviceType: { type: String, enum: ["singleDevice", "multiDevice"], required: true },
  backedUp: { type: Boolean, default: false },
}, { timestamps: true });

PasskeySchema.index({ userId: 1, createdAt: -1 });

export const Passkey: Model<IPasskey> =
  (models.Passkey as Model<IPasskey>) || model<IPasskey>("Passkey", PasskeySchema);
