import { connectDB, toPlain } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { Notebook } from "@/models/Notebook";

const HEX = /^#[0-9a-fA-F]{6}$/;

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const docs = await Notebook.find({ userId: session.userId }).sort({ updatedAt: -1 });
  return Response.json({ notebooks: docs.map(toPlain) });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    color?: string;
  };
  const title = (body.title ?? "").trim();
  if (!title) return Response.json({ error: "Title is required." }, { status: 400 });
  const color = body.color ?? "#4f7cff";
  if (!HEX.test(color)) return Response.json({ error: "Color must be a hex value." }, { status: 400 });
  await connectDB();
  const doc = await Notebook.create({ userId: session.userId, title, color });
  return Response.json({ notebook: toPlain(doc) }, { status: 201 });
}
