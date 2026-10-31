import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IPage extends Document {
  userId: Types.ObjectId;
  chapterId: Types.ObjectId;
  title: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

const PageSchema = new Schema<IPage>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  chapterId: { type: Schema.Types.ObjectId, ref: "Chapter", required: true, index: true },
  title: { type: String, required: true, trim: true },
  order: { type: Number, default: 0 },
  createdAt: { type: Number, default: Date.now },
  updatedAt: { type: Number, default: Date.now },
});

PageSchema.pre("save", function () {
  this.updatedAt = Date.now();
});

export const Page =
  mongoose.models.Page ?? mongoose.model<IPage>("Page", PageSchema);
