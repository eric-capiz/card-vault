import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { Notebook } from "@/models/Notebook";
import { Chapter } from "@/models/Chapter";
import { Page } from "@/models/Page";
import { PageItem } from "@/models/PageItem";

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (!q) {
    return Response.json({ notebooks: [], chapters: [], pages: [], notes: [] });
  }
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  await connectDB();
  const userId = session.userId;
  const notebooks = await Notebook.find({ userId, title: re }).limit(20);
  const chapters = await Chapter.find({ userId, title: re }).limit(20);
  const pages = await Page.find({ userId, title: re }).limit(20);
  const notes = await PageItem.find({ userId, type: "note", text: re }).limit(20);
  const chapterById = new Map(
    (await Chapter.find({ userId, _id: { $in: pages.map((p) => p.chapterId) } })).map(
      (c) => [String(c._id), c],
    ),
  );
  const pageById = new Map(
    (await Page.find({ userId, _id: { $in: notes.map((n) => n.pageId) } })).map((p) => [
      String(p._id),
      p,
    ]),
  );
  return Response.json({
    notebooks: notebooks.map((n) => ({ _id: String(n._id), title: n.title, color: n.color })),
    chapters: chapters.map((c) => ({
      _id: String(c._id),
      title: c.title,
      notebookId: String(c.notebookId),
    })),
    pages: pages.map((p) => {
      const ch = chapterById.get(String(p.chapterId));
      return {
        _id: String(p._id),
        title: p.title,
        chapterId: String(p.chapterId),
        notebookId: ch ? String(ch.notebookId) : "",
      };
    }),
    notes: notes.map((n) => {
      const pg = pageById.get(String(n.pageId));
      const ch = pg ? chapterById.get(String(pg.chapterId)) : undefined;
      const plain = stripTags(n.text ?? "");
      const idx = plain.toLowerCase().indexOf(q.toLowerCase());
      const snippet =
        idx >= 0
          ? plain.slice(Math.max(0, idx - 40), idx + 120)
          : plain.slice(0, 120);
      return {
        _id: String(n._id),
        snippet,
        pageId: String(n.pageId),
        pageTitle: pg ? pg.title : "",
        notebookId: ch ? String(ch.notebookId) : "",
      };
    }),
  });
}
