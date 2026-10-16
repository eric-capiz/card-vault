import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IDeck extends Document {
  userId: Types.ObjectId;
  name: string;
  main: number[];
  extra: number[];
  side: number[];
}

const DeckSchema = new Schema<IDeck>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, maxlength: 120 },
    main: { type: [Number], default: [] },
    extra: { type: [Number], default: [] },
    side: { type: [Number], default: [] },
  },
  { timestamps: true }
);

export const Deck: Model<IDeck> =
  mongoose.models.Deck ?? mongoose.model<IDeck>("Deck", DeckSchema);
