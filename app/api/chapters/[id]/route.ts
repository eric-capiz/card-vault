import { toPlain } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { getChapter } from "@/lib/owner";
import { swapOrder } from "@/lib/reorder";
import { trashChapter } from "@/lib/trash";
import { Chapter } from "@/models/Chapter";

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
      { notebookId: ch.notebookId, userId: session.userId, deletedAt: null },
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
  // Delete moves to Trash (soft-delete cascade); Trash restores or purges.
  await trashChapter(session.userId, id);
  return Response.json({ ok: true });
}
