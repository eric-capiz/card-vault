import { connectDB, toPlain } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { getPage } from "@/lib/owner";
import { swapOrder } from "@/lib/reorder";
import { Page } from "@/models/Page";
import { PageItem } from "@/models/PageItem";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const pg = await getPage(session.userId, id);
  if (!pg) return Response.json({ error: "Not found." }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    move?: "up" | "down";
  };
  if (body.move) {
    await swapOrder(
      Page as never,
      { chapterId: pg.chapterId, userId: session.userId },
      String(pg._id),
      body.move,
    );
    const fresh = await getPage(session.userId, id);
    return Response.json({ page: fresh ? toPlain(fresh) : null });
  }
  if (body.title !== undefined) {
    const title = body.title.trim();
    if (!title) return Response.json({ error: "Title is required." }, { status: 400 });
    pg.title = title;
    await pg.save();
  }
  return Response.json({ page: toPlain(pg) });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const pg = await getPage(session.userId, id);
  if (!pg) return Response.json({ error: "Not found." }, { status: 404 });
  await connectDB();
  await PageItem.deleteMany({ pageId: pg._id, userId: session.userId });
  await pg.deleteOne();
  return Response.json({ ok: true });
}
