import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Deck } from "@/models/Deck";
import { getSession } from "@/lib/auth";

async function requireUser() {
  const session = await getSession();
  if (!session) return null;
  await connectDB();
  return session;
}

function sanitizeIds(ids: unknown): number[] {
  if (!Array.isArray(ids)) return [];
  return ids
    .map((n) => Number(n))
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 200);
}

/** GET /api/decks — list the current user's decks. */
export async function GET() {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const decks = await Deck.find({ userId: session.userId })
    .sort({ updatedAt: -1 })
    .lean();
  return NextResponse.json({
    decks: decks.map((d) => ({
      id: d._id.toString(),
      name: d.name,
      main: d.main,
      extra: d.extra,
      side: d.side,
    })),
  });
}

/** POST /api/decks — create a deck. */
export async function POST(req: NextRequest) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let body: { name?: string; main?: unknown; extra?: unknown; side?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const name = String(body.name ?? "Untitled Deck").slice(0, 120) || "Untitled Deck";
  const deck = await Deck.create({
    userId: session.userId,
    name,
    main: sanitizeIds(body.main),
    extra: sanitizeIds(body.extra),
    side: sanitizeIds(body.side),
  });
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
