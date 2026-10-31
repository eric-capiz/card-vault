import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface INotebook extends Document {
  userId: Types.ObjectId;
  title: string;
  /** Solid cover color, stored as a hex string the user picks and can change. */
  color: string;
  createdAt: number;
  updatedAt: number;
}

const NotebookSchema = new Schema<INotebook>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true },
  color: { type: String, default: "#4f7cff" },
  createdAt: { type: Number, default: Date.now },
  updatedAt: { type: Number, default: Date.now },
});

NotebookSchema.pre("save", function () {
  this.updatedAt = Date.now();
});

export const Notebook =
  mongoose.models.Notebook ?? mongoose.model<INotebook>("Notebook", NotebookSchema);
