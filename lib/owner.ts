import { connectDB } from "./mongodb";
import { Notebook } from "@/models/Notebook";
import { Chapter } from "@/models/Chapter";
import { Page } from "@/models/Page";
import { PageItem } from "@/models/PageItem";

/**
 * Ownership helpers. Every notebook, chapter, page, and item carries a
 * denormalized userId, so a single scoped lookup proves ownership — no
 * parent-chain walks, and no user can ever touch another user's data.
 * Returns the document, or null when it does not exist or is not theirs.
 */
export async function getNotebook(userId: string, id: string) {
  await connectDB();
  return Notebook.findOne({ _id: id, userId });
}

export async function getChapter(userId: string, id: string) {
  await connectDB();
  return Chapter.findOne({ _id: id, userId });
}

export async function getPage(userId: string, id: string) {
  await connectDB();
  return Page.findOne({ _id: id, userId });
}

export async function getItem(userId: string, id: string) {
  await connectDB();
  return PageItem.findOne({ _id: id, userId });
}
