import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IVaultCard {
  ygoId: number;
  name: string;
  qty: number;
  setCode?: string;
  rarity?: string;
  price: number;
  imageSmall: string;
  cardType: string;
  frameType: string;
  attribute?: string;
  race?: string;
  archetype?: string;
  setName?: string;
}

export interface IVault extends Document {
  userId: Types.ObjectId;
  cards: IVaultCard[];
}

const VaultCardSchema = new Schema<IVaultCard>(
  {
    ygoId: { type: Number, required: true },
    name: { type: String, required: true },
    qty: { type: Number, required: true, default: 1, min: 1 },
    setCode: String,
    rarity: String,
    price: { type: Number, default: 0 },
    imageSmall: { type: String, default: "" },
    cardType: { type: String, default: "" },
    frameType: { type: String, default: "" },
    attribute: String,
    race: String,
    archetype: String,
    setName: String,
  },
  { _id: false }
);

const VaultSchema = new Schema<IVault>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    cards: { type: [VaultCardSchema], default: [] },
  },
  { timestamps: true }
);

export const Vault: Model<IVault> =
  mongoose.models.Vault ?? mongoose.model<IVault>("Vault", VaultSchema);
