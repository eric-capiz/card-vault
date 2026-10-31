import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { Notebook } from "@/models/Notebook";
import { Chapter } from "@/models/Chapter";
import { Page } from "@/models/Page";
import {
  purgeOld,
  restoreItem,
  deleteNotebookForever,
  deleteChapterForever,
  deletePageForever,
} from "@/lib/trash";

type TrashItem = {
  kind: "notebook" | "chapter" | "page";
  id: string;
  title: string;
  parent: string;
  deletedAt: number;
};

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId;
  // Visiting Trash purges items trashed more than 30 days ago.
  await purgeOld(userId);
  await connectDB();
  const trashed = { deletedAt: { $gt: 0 } };
  const notebooks = await Notebook.find({ userId, ...trashed }).sort({ deletedAt: -1 });
  const chapters = await Chapter.find({ userId, ...trashed }).sort({ deletedAt: -1 });
  const pages = await Page.find({ userId, ...trashed }).sort({ deletedAt: -1 });
  const notebookById = new Map(
    (await Notebook.find({ userId })).map((n) => [String(n._id), n.title]),
  );
  const chapterById = new Map(
    (await Chapter.find({ userId })).map((c) => [
      String(c._id),
      { title: c.title, notebookId: String(c.notebookId) },
    ]),
  );
  const items: TrashItem[] = [];
  for (const n of notebooks) {
    items.push({
      kind: "notebook",
      id: String(n._id),
      title: n.title,
      parent: "",
      deletedAt: n.deletedAt ?? 0,
    });
  }
  for (const c of chapters) {
    items.push({
      kind: "chapter",
      id: String(c._id),
      title: c.title,
      parent: notebookById.get(String(c.notebookId)) ?? "",
      deletedAt: c.deletedAt ?? 0,
    });
  }
  for (const p of pages) {
    const ch = chapterById.get(String(p.chapterId));
    items.push({
      kind: "page",
      id: String(p._id),
      title: p.title,
      parent: ch ? `${notebookById.get(ch.notebookId) ?? ""} · ${ch.title}` : "",
      deletedAt: p.deletedAt ?? 0,
    });
  }
  items.sort((a, b) => b.deletedAt - a.deletedAt);
  return Response.json({ items });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    kind?: string;
    id?: string;
    action?: string;
  };
  const { kind, id, action } = body;
  if (
    (kind !== "notebook" && kind !== "chapter" && kind !== "page") ||
    !id ||
    (action !== "restore" && action !== "delete")
  ) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  await connectDB();
  const userId = session.userId;
  const model = kind === "notebook" ? Notebook : kind === "chapter" ? Chapter : Page;
  const doc = await model.findOne({ _id: id, userId, deletedAt: { $gt: 0 } });
  if (!doc) return Response.json({ error: "Not found." }, { status: 404 });
  if (action === "restore") {
    await restoreItem(userId, kind, id);
  } else if (kind === "notebook") {
    await deleteNotebookForever(userId, id);
  } else if (kind === "chapter") {
    await deleteChapterForever(userId, id);
  } else {
    await deletePageForever(userId, id);
  }
  return Response.json({ ok: true });
}
