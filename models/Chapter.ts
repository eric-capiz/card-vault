import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IChapter extends Document {
  userId: Types.ObjectId;
  notebookId: Types.ObjectId;
  title: string;
  order: number;
  /** Soft-delete timestamp (null = live). Trash restore clears this. */
  deletedAt: number | null;
  /** Id of the top-level item this was trashed with (itself when trashed directly). */
  trashedWith: Types.ObjectId | null;
  createdAt: number;
  updatedAt: number;
}

const ChapterSchema = new Schema<IChapter>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  notebookId: { type: Schema.Types.ObjectId, ref: "Notebook", required: true, index: true },
  title: { type: String, required: true, trim: true },
  order: { type: Number, default: 0 },
  deletedAt: { type: Number, default: null },
  trashedWith: { type: Schema.Types.ObjectId, default: null },
  createdAt: { type: Number, default: Date.now },
  updatedAt: { type: Number, default: Date.now },
});

ChapterSchema.pre("save", function () {
  this.updatedAt = Date.now();
});

export const Chapter =
  mongoose.models.Chapter ?? mongoose.model<IChapter>("Chapter", ChapterSchema);
