import { connectDB, toPlain } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { getPage } from "@/lib/owner";
import { PageItem } from "@/models/PageItem";

/** 10 MB per attachment — keeps documents well under MongoDB's 16 MB limit. */
const MAX_BYTES = 10 * 1024 * 1024;

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const pageId = new URL(req.url).searchParams.get("pageId") ?? "";
  const pg = await getPage(session.userId, pageId);
  if (!pg) return Response.json({ error: "Not found." }, { status: 404 });
  const docs = await PageItem.find({ pageId: pg._id, userId: session.userId }).sort({
    order: 1,
    createdAt: 1,
  });
  return Response.json({ items: docs.map(toPlain) });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    pageId?: string;
    type?: string;
    text?: string;
    dataUrl?: string;
    fileName?: string;
    mimeType?: string;
    size?: number;
  };
  if (body.type !== "note" && body.type !== "image" && body.type !== "file") {
    return Response.json({ error: "Invalid block type." }, { status: 400 });
  }
  const pg = await getPage(session.userId, body.pageId ?? "");
  if (!pg) return Response.json({ error: "Not found." }, { status: 404 });
  if (body.type !== "note") {
    if (!body.dataUrl) return Response.json({ error: "No file data." }, { status: 400 });
    if ((body.size ?? 0) > MAX_BYTES || body.dataUrl.length > 15_000_000) {
      return Response.json(
        { error: "That file is over the 10 MB limit." },
        { status: 400 },
      );
    }
  }
  await connectDB();
  const order = await PageItem.countDocuments({ pageId: pg._id, userId: session.userId });
  const doc = await PageItem.create({
    userId: session.userId,
    pageId: pg._id,
    type: body.type,
    order,
    text: body.text ?? "",
    dataUrl: body.dataUrl ?? "",
    fileName: body.fileName ?? "",
    mimeType: body.mimeType ?? "",
    size: body.size ?? 0,
  });
  return Response.json({ item: toPlain(doc) }, { status: 201 });
}
