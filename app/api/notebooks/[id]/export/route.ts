import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { getNotebook } from "@/lib/owner";
import { Chapter } from "@/models/Chapter";
import { Page } from "@/models/Page";
import { PageItem } from "@/models/PageItem";

function noteToText(html: string): string {
  const spaced = html
    .replace(/<\/(p|div|li|h\d)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n");
  return spaced
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const nb = await getNotebook(session.userId, id);
  if (!nb) return Response.json({ error: "Not found." }, { status: 404 });
  await connectDB();
  const userId = session.userId;
  const chapters = await Chapter.find({
    notebookId: nb._id,
    userId,
    deletedAt: null,
  }).sort({ order: 1, createdAt: 1 });
  const lines: string[] = [`# ${nb.title}`, ""];
  for (const ch of chapters) {
    lines.push(`## ${ch.title}`, "");
    const pages = await Page.find({
      chapterId: ch._id,
      userId,
      deletedAt: null,
    }).sort({ order: 1, createdAt: 1 });
    for (const pg of pages) {
      lines.push(`### ${pg.title || "Untitled page"}`, "");
      const items = await PageItem.find({ pageId: pg._id, userId }).sort({
        order: 1,
        createdAt: 1,
      });
      for (const it of items) {
        if (it.type === "note") {
          const text = noteToText(it.text ?? "");
          if (text) lines.push(text, "");
        } else if (it.type === "image") {
          lines.push(`![Image: ${it.fileName || "image"}]`, "");
        } else {
          lines.push(`[File: ${it.fileName || "file"}]`, "");
        }
      }
    }
  }
  const safe = nb.title.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "notebook";
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safe}.md"`,
    },
  });
}
