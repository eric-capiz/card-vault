import { connectDB } from "./mongodb";
import { Notebook } from "@/models/Notebook";
import { Chapter } from "@/models/Chapter";
import { Page } from "@/models/Page";
import { PageItem } from "@/models/PageItem";

/**
 * Trash is soft-delete: the item keeps its parent and order, so restoring it
 * puts it back exactly where it was. trashedWith records the top-level item
 * trashed (itself when trashed directly), so restoring a notebook or chapter
 * revives only the items trashed along with it — never items the user
 * trashed individually beforehand.
 *
 * Delete-forever is the mirror rule: it only ever touches items currently
 * in Trash. Deleting a chapter takes only its trashed pages with it, and
 * deleting a notebook takes only its trashed chapters and trashed pages.
 * Anything still live — including a page restored out from under a trashed
 * parent — is never deleted by a Trash action.
 */

export async function trashPage(userId: string, pageId: string) {
  await connectDB();
  await Page.updateOne(
    { _id: pageId, userId, deletedAt: null },
    { deletedAt: Date.now(), trashedWith: pageId },
  );
}

export async function trashChapter(userId: string, chapterId: string) {
  await connectDB();
  const now = Date.now();
  await Chapter.updateOne(
    { _id: chapterId, userId, deletedAt: null },
    { deletedAt: now, trashedWith: chapterId },
  );
  await Page.updateMany(
    { chapterId, userId, deletedAt: null },
    { deletedAt: now, trashedWith: chapterId },
  );
}

export async function trashNotebook(userId: string, notebookId: string) {
  await connectDB();
  const now = Date.now();
  await Notebook.updateOne(
    { _id: notebookId, userId, deletedAt: null },
    { deletedAt: now, trashedWith: notebookId },
  );
  const chapters = await Chapter.find({ notebookId, userId, deletedAt: null }).select("_id");
  const chapterIds = chapters.map((c) => c._id);
  await Chapter.updateMany(
    { notebookId, userId, deletedAt: null },
    { deletedAt: now, trashedWith: notebookId },
  );
  if (chapterIds.length) {
    await Page.updateMany(
      { chapterId: { $in: chapterIds }, userId, deletedAt: null },
      { deletedAt: now, trashedWith: notebookId },
    );
  }
}

const CLEAR = { deletedAt: null, trashedWith: null };

export async function restoreItem(
  userId: string,
  kind: "notebook" | "chapter" | "page",
  id: string,
) {
  await connectDB();
  if (kind === "page") {
    await Page.updateOne({ _id: id, userId, deletedAt: { $gt: 0 } }, CLEAR);
  } else if (kind === "chapter") {
    await Chapter.updateOne({ _id: id, userId, deletedAt: { $gt: 0 } }, CLEAR);
    await Page.updateMany({ chapterId: id, userId, trashedWith: id }, CLEAR);
  } else {
    await Notebook.updateOne({ _id: id, userId, deletedAt: { $gt: 0 } }, CLEAR);
    const chapters = await Chapter.find({ notebookId: id, userId }).select("_id");
    const chapterIds = chapters.map((c) => c._id);
    await Chapter.updateMany({ notebookId: id, userId, trashedWith: id }, CLEAR);
    if (chapterIds.length) {
      await Page.updateMany(
        { chapterId: { $in: chapterIds }, userId, trashedWith: id },
        CLEAR,
      );
    }
  }
}

export async function deletePageForever(userId: string, pageId: string): Promise<boolean> {
  await connectDB();
  const doc = await Page.findOne({ _id: pageId, userId, deletedAt: { $gt: 0 } }).select("_id");
  if (!doc) return false;
  await PageItem.deleteMany({ pageId, userId });
  await Page.deleteOne({ _id: pageId, userId });
  return true;
}

export async function deleteChapterForever(
  userId: string,
  chapterId: string,
): Promise<boolean> {
  await connectDB();
  const doc = await Chapter.findOne({
    _id: chapterId,
    userId,
    deletedAt: { $gt: 0 },
  }).select("_id");
  if (!doc) return false;
  // Only pages currently in Trash go with the chapter — live pages are untouched.
  const pages = await Page.find({ chapterId, userId, deletedAt: { $gt: 0 } }).select("_id");
  const pageIds = pages.map((p) => p._id);
  if (pageIds.length) await PageItem.deleteMany({ pageId: { $in: pageIds }, userId });
  await Page.deleteMany({ chapterId, userId, deletedAt: { $gt: 0 } });
  await Chapter.deleteOne({ _id: chapterId, userId });
  return true;
}

export async function deleteNotebookForever(
  userId: string,
  notebookId: string,
): Promise<boolean> {
  await connectDB();
  const doc = await Notebook.findOne({
    _id: notebookId,
    userId,
    deletedAt: { $gt: 0 },
  }).select("_id");
  if (!doc) return false;
  const chapters = await Chapter.find({ notebookId, userId }).select("_id");
  const chapterIds = chapters.map((c) => c._id);
  // Only chapters and pages currently in Trash go with the notebook.
  // A trashed page under a live chapter still counts as in Trash; a live
  // chapter or page is never touched.
  const pages = chapterIds.length
    ? await Page.find({
        chapterId: { $in: chapterIds },
        userId,
        deletedAt: { $gt: 0 },
      }).select("_id")
    : [];
  const pageIds = pages.map((p) => p._id);
  if (pageIds.length) await PageItem.deleteMany({ pageId: { $in: pageIds }, userId });
  if (chapterIds.length)
    await Page.deleteMany({
      chapterId: { $in: chapterIds },
      userId,
      deletedAt: { $gt: 0 },
    });
  await Chapter.deleteMany({ notebookId, userId, deletedAt: { $gt: 0 } });
  await Notebook.deleteOne({ _id: notebookId, userId });
  return true;
}

type TrashKind = "notebook" | "chapter" | "page";

const deleteForeverFn = {
  notebook: deleteNotebookForever,
  chapter: deleteChapterForever,
  page: deletePageForever,
};

/**
 * Deletes the given items forever, silently skipping anything not currently
 * in Trash. Returns how many were actually deleted.
 */
export async function deleteSelectedForever(
  userId: string,
  kind: TrashKind,
  ids: string[],
): Promise<number> {
  let deleted = 0;
  for (const id of ids) {
    if (await deleteForeverFn[kind](userId, id)) deleted += 1;
  }
  return deleted;
}

/** Deletes every trashed item of one kind forever. Returns how many were deleted. */
export async function deleteAllOfKindForever(
  userId: string,
  kind: TrashKind,
): Promise<number> {
  await connectDB();
  const model = kind === "notebook" ? Notebook : kind === "chapter" ? Chapter : Page;
  const docs = await model.find({ userId, deletedAt: { $gt: 0 } }).select("_id");
  return deleteSelectedForever(
    userId,
    kind,
    docs.map((d) => String(d._id)),
  );
}

/** Permanently deletes items trashed more than 30 days ago. Runs on Trash visits. */
export async function purgeOld(userId: string) {
  await connectDB();
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const oldNotebooks = await Notebook.find({
    userId,
    deletedAt: { $gt: 0, $lt: cutoff },
  }).select("_id");
  for (const nb of oldNotebooks) await deleteNotebookForever(userId, String(nb._id));
  const oldChapters = await Chapter.find({
    userId,
    deletedAt: { $gt: 0, $lt: cutoff },
  }).select("_id");
  for (const ch of oldChapters) await deleteChapterForever(userId, String(ch._id));
  const oldPages = await Page.find({
    userId,
    deletedAt: { $gt: 0, $lt: cutoff },
  }).select("_id");
  for (const pg of oldPages) await deletePageForever(userId, String(pg._id));
}
