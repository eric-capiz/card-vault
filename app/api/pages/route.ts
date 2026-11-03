import { connectDB, toPlain } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { getChapter } from "@/lib/owner";
import { Page } from "@/models/Page";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const chapterId = new URL(req.url).searchParams.get("chapterId") ?? "";
  const ch = await getChapter(session.userId, chapterId);
  if (!ch) return Response.json({ error: "Not found." }, { status: 404 });
  const docs = await Page.find({ chapterId: ch._id, userId: session.userId, deletedAt: null }).sort({
    order: 1,
    createdAt: 1,
  });
  return Response.json({ pages: docs.map(toPlain) });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    chapterId?: string;
    title?: string;
  };
  // Page titles are optional: an empty title creates an untitled page.
  const title = (body.title ?? "").trim();
  const ch = await getChapter(session.userId, body.chapterId ?? "");
  if (!ch) return Response.json({ error: "Not found." }, { status: 404 });
  await connectDB();
  const order = await Page.countDocuments({ chapterId: ch._id, userId: session.userId });
  const doc = await Page.create({
    userId: session.userId,
    chapterId: ch._id,
    title,
    order,
  });
  return Response.json({ page: toPlain(doc) }, { status: 201 });
}
