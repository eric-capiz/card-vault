import mongoose, { Schema, type Document, type Types } from "mongoose";

export type PageItemType = "note" | "image" | "file";

/**
 * One block on a page. A page is a stack of blocks in order:
 * - note:  rich text (HTML) — highlights live here as <mark> tags.
 * - image: an image stored as a base64 data URL (client-compressed).
 * - file:  any other attachment (e.g. a PDF) stored as a base64 data URL.
 */
export interface IPageItem extends Document {
  userId: Types.ObjectId;
  pageId: Types.ObjectId;
  type: PageItemType;
  order: number;
  /** Note content (HTML, may contain <mark data-color> highlights). */
  text: string;
  /** Base64 data URL for image/file blocks. */
  dataUrl: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: number;
  updatedAt: number;
}

const PageItemSchema = new Schema<IPageItem>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  pageId: { type: Schema.Types.ObjectId, ref: "Page", required: true, index: true },
  type: { type: String, enum: ["note", "image", "file"], required: true },
  order: { type: Number, default: 0 },
  text: { type: String, default: "" },
  dataUrl: { type: String, default: "" },
  fileName: { type: String, default: "" },
  mimeType: { type: String, default: "" },
  size: { type: Number, default: 0 },
  createdAt: { type: Number, default: Date.now },
  updatedAt: { type: Number, default: Date.now },
});

PageItemSchema.pre("save", function () {
  this.updatedAt = Date.now();
});

export const PageItem =
  mongoose.models.PageItem ?? mongoose.model<IPageItem>("PageItem", PageItemSchema);
