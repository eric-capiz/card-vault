import { toPlain } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { getItem } from "@/lib/owner";
import { swapOrder } from "@/lib/reorder";
import { PageItem } from "@/models/PageItem";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const item = await getItem(session.userId, id);
  if (!item) return Response.json({ error: "Not found." }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as {
    text?: string;
    move?: "up" | "down";
  };
  if (body.move) {
    await swapOrder(
      PageItem as never,
      { pageId: item.pageId, userId: session.userId },
      String(item._id),
      body.move,
    );
    const fresh = await getItem(session.userId, id);
    return Response.json({ item: fresh ? toPlain(fresh) : null });
  }
  if (body.text !== undefined) {
    item.text = body.text;
    await item.save();
  }
  return Response.json({ item: toPlain(item) });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const item = await getItem(session.userId, id);
  if (!item) return Response.json({ error: "Not found." }, { status: 404 });
  await item.deleteOne();
  return Response.json({ ok: true });
}
