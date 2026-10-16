import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Deck } from "@/models/Deck";
import { getSession } from "@/lib/auth";

function sanitizeIds(ids: unknown): number[] {
  if (!Array.isArray(ids)) return [];
  return ids
    .map((n) => Number(n))
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 200);
}

/** PUT /api/decks/[id] — update one of the user's decks. */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  let body: { name?: string; main?: unknown; extra?: unknown; side?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  await connectDB();
  const deck = await Deck.findOneAndUpdate(
    { _id: id, userId: session.userId },
    {
      $set: {
        ...(body.name !== undefined
          ? { name: String(body.name).slice(0, 120) || "Untitled Deck" }
          : {}),
        ...(body.main !== undefined ? { main: sanitizeIds(body.main) } : {}),
        ...(body.extra !== undefined ? { extra: sanitizeIds(body.extra) } : {}),
        ...(body.side !== undefined ? { side: sanitizeIds(body.side) } : {}),
      },
    },
    { new: true }
  ).lean();
  if (!deck) return NextResponse.json({ error: "Deck not found." }, { status: 404 });
  return NextResponse.json({
    deck: {
      id: deck._id.toString(),
      name: deck.name,
      main: deck.main,
      extra: deck.extra,
      side: deck.side,
    },
  });
}

/** DELETE /api/decks/[id] — delete one of the user's decks. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  await connectDB();
  const result = await Deck.deleteOne({ _id: id, userId: session.userId });
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Deck not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
