import { connectDB, toPlain } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { getChapter } from "@/lib/owner";
import { swapOrder } from "@/lib/reorder";
import { Chapter } from "@/models/Chapter";
import { Page } from "@/models/Page";
import { PageItem } from "@/models/PageItem";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ch = await getChapter(session.userId, id);
  if (!ch) return Response.json({ error: "Not found." }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    move?: "up" | "down";
  };
  if (body.move) {
    await swapOrder(
      Chapter as never,
      { notebookId: ch.notebookId, userId: session.userId },
      String(ch._id),
      body.move,
    );
    const fresh = await getChapter(session.userId, id);
    return Response.json({ chapter: fresh ? toPlain(fresh) : null });
  }
  if (body.title !== undefined) {
    const title = body.title.trim();
    if (!title) return Response.json({ error: "Title is required." }, { status: 400 });
    ch.title = title;
    await ch.save();
  }
  return Response.json({ chapter: toPlain(ch) });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ch = await getChapter(session.userId, id);
  if (!ch) return Response.json({ error: "Not found." }, { status: 404 });
  await connectDB();
  const pages = await Page.find({ chapterId: ch._id, userId: session.userId }).select("_id");
  const pageIds = pages.map((p) => p._id);
  await PageItem.deleteMany({ pageId: { $in: pageIds }, userId: session.userId });
  await Page.deleteMany({ chapterId: ch._id, userId: session.userId });
  await ch.deleteOne();
  return Response.json({ ok: true });
}
