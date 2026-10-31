import { connectDB, toPlain } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { getNotebook } from "@/lib/owner";
import { Chapter } from "@/models/Chapter";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const notebookId = new URL(req.url).searchParams.get("notebookId") ?? "";
  const nb = await getNotebook(session.userId, notebookId);
  if (!nb) return Response.json({ error: "Not found." }, { status: 404 });
  const docs = await Chapter.find({ notebookId: nb._id, userId: session.userId }).sort({
    order: 1,
    createdAt: 1,
  });
  return Response.json({ chapters: docs.map(toPlain) });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    notebookId?: string;
    title?: string;
  };
  const title = (body.title ?? "").trim();
  if (!title) return Response.json({ error: "Title is required." }, { status: 400 });
  const nb = await getNotebook(session.userId, body.notebookId ?? "");
  if (!nb) return Response.json({ error: "Not found." }, { status: 404 });
  await connectDB();
  const order = await Chapter.countDocuments({ notebookId: nb._id, userId: session.userId });
  const doc = await Chapter.create({
    userId: session.userId,
    notebookId: nb._id,
    title,
    order,
  });
  return Response.json({ chapter: toPlain(doc) }, { status: 201 });
}
