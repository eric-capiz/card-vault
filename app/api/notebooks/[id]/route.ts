import { toPlain } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { getNotebook } from "@/lib/owner";
import { trashNotebook } from "@/lib/trash";

const HEX = /^#[0-9a-fA-F]{6}$/;

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const nb = await getNotebook(session.userId, id);
  if (!nb) return Response.json({ error: "Not found." }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    color?: string;
  };
  if (body.title !== undefined) {
    const title = body.title.trim();
    if (!title) return Response.json({ error: "Title is required." }, { status: 400 });
    nb.title = title;
  }
  if (body.color !== undefined) {
    if (!HEX.test(body.color)) {
      return Response.json({ error: "Color must be a hex value." }, { status: 400 });
    }
    nb.color = body.color;
  }
  await nb.save();
  return Response.json({ notebook: toPlain(nb) });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const nb = await getNotebook(session.userId, id);
  if (!nb) return Response.json({ error: "Not found." }, { status: 404 });
  // Delete moves to Trash (soft-delete cascade); Trash restores or purges.
  await trashNotebook(session.userId, id);
  return Response.json({ ok: true });
}
