import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IPage extends Document {
  userId: Types.ObjectId;
  chapterId: Types.ObjectId;
  title: string;
  order: number;
  tags: string[];
  pinned: boolean;
  /** Soft-delete timestamp (null = live). Trash restore clears this. */
  deletedAt: number | null;
  /** Id of the top-level item this was trashed with (itself when trashed directly). */
  trashedWith: Types.ObjectId | null;
  createdAt: number;
  updatedAt: number;
}

const PageSchema = new Schema<IPage>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  chapterId: { type: Schema.Types.ObjectId, ref: "Chapter", required: true, index: true },
  // Page titles are optional: a page may hold only notes. Empty string
  // means untitled; displays fall back to "Untitled page".
  title: { type: String, default: "", trim: true },
  order: { type: Number, default: 0 },
  tags: { type: [String], default: [] },
  pinned: { type: Boolean, default: false },
  deletedAt: { type: Number, default: null },
  trashedWith: { type: Schema.Types.ObjectId, default: null },
  createdAt: { type: Number, default: Date.now },
  updatedAt: { type: Number, default: Date.now },
});

PageSchema.pre("save", function () {
  this.updatedAt = Date.now();
});

export const Page =
  mongoose.models.Page ?? mongoose.model<IPage>("Page", PageSchema);
