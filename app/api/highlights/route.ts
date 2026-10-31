import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { getNotebook } from "@/lib/owner";
import { Chapter } from "@/models/Chapter";
import { Page } from "@/models/Page";
import { PageItem } from "@/models/PageItem";

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

function plainText(html: string): string {
  const spaced = html
    .replace(/<\/(p|div|li|h\d)>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ");
  return stripTags(spaced)
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

function contextAround(plain: string, needle: string, cursor: number) {
  const idx = plain.indexOf(needle, cursor);
  if (idx === -1) return { before: "", after: "", next: cursor };
  const WINDOW = 80;
  let before = plain.slice(Math.max(0, idx - WINDOW), idx);
  let after = plain.slice(idx + needle.length, idx + needle.length + WINDOW);
  const truncatedBefore = idx > WINDOW;
  const truncatedAfter = idx + needle.length + WINDOW < plain.length;
  if (truncatedBefore) {
    const firstSpace = before.indexOf(" ");
    if (firstSpace !== -1) before = before.slice(firstSpace + 1);
  }
  if (truncatedAfter) {
    const lastSpace = after.lastIndexOf(" ");
    if (lastSpace !== -1) after = after.slice(0, lastSpace);
  }
  return {
    before: (truncatedBefore ? "…" : "") + before,
    after: after + (truncatedAfter ? "…" : ""),
    next: idx + needle.length,
  };
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
    contextBefore: string;
    contextAfter: string;
    pageId: string;
    pageTitle: string;
    chapterTitle: string;
  }[] = [];
  const markRe = /<mark[^>]*data-color="([^"]*)"[^>]*>(.*?)<\/mark>/g;
  for (const note of notes) {
    const page = pageById.get(String(note.pageId));
    if (!page) continue;
    const plain = plainText(note.text ?? "");
    let cursor = 0;
    let m: RegExpExecArray | null;
    markRe.lastIndex = 0;
    while ((m = markRe.exec(note.text ?? "")) !== null) {
      const text = stripTags(m[2]).replace(/\s+/g, " ").trim();
      if (!text) continue;
      const ctx = contextAround(plain, text, cursor);
      cursor = ctx.next;
      highlights.push({
        color: m[1] || "#ffeb3b",
        text,
        contextBefore: ctx.before,
        contextAfter: ctx.after,
        pageId: String(note.pageId),
        pageTitle: page.title,
        chapterTitle: chapterById.get(page.chapterId) ?? "",
      });
    }
  }
  return Response.json({ highlights });
}
