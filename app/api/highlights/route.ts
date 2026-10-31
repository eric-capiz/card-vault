import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { getNotebook } from "@/lib/owner";
import { Chapter } from "@/models/Chapter";
import { Page } from "@/models/Page";
import { PageItem } from "@/models/PageItem";

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const notebookId = new URL(req.url).searchParams.get("notebookId") ?? "";
  const nb = await getNotebook(session.userId, notebookId);
  if (!nb) return Response.json({ error: "Not found." }, { status: 404 });
  await connectDB();
  const chapters = await Chapter.find({ notebookId: nb._id, userId: session.userId });
  const chapterById = new Map(chapters.map((c) => [String(c._id), c.title]));
  const pages = await Page.find({
    chapterId: { $in: chapters.map((c) => c._id) },
    userId: session.userId,
  });
  const pageById = new Map(
    pages.map((p) => [String(p._id), { title: p.title, chapterId: String(p.chapterId) }]),
  );
  const notes = await PageItem.find({
    pageId: { $in: pages.map((p) => p._id) },
    userId: session.userId,
    type: "note",
  });
  const highlights: {
    color: string;
    text: string;
    pageId: string;
    pageTitle: string;
    chapterTitle: string;
  }[] = [];
  const markRe = /<mark[^>]*data-color="([^"]*)"[^>]*>(.*?)<\/mark>/g;
  for (const note of notes) {
    const page = pageById.get(String(note.pageId));
    if (!page) continue;
    let m: RegExpExecArray | null;
    markRe.lastIndex = 0;
    while ((m = markRe.exec(note.text ?? "")) !== null) {
      const text = stripTags(m[2]).trim();
      if (!text) continue;
      highlights.push({
        color: m[1] || "#ffeb3b",
        text,
        pageId: String(note.pageId),
        pageTitle: page.title,
        chapterTitle: chapterById.get(page.chapterId) ?? "",
      });
    }
  }
  return Response.json({ highlights });
}
