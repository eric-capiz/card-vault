import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Vault } from "@/models/Vault";
import { getSession } from "@/lib/auth";

async function requireUser() {
  const session = await getSession();
  if (!session) return null;
  await connectDB();
  return session;
}

/** GET /api/vault — the current user's cards. */
export async function GET() {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const vault = await Vault.findOne({ userId: session.userId }).lean();
  return NextResponse.json({ cards: vault?.cards ?? [] });
}

/** PUT /api/vault — replace the current user's cards. */
export async function PUT(req: NextRequest) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let body: { cards?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!Array.isArray(body.cards)) {
    return NextResponse.json({ error: "cards must be an array." }, { status: 400 });
  }
  // Sanitize: only allow known fields, cap size to prevent abuse.
  const cards = body.cards.slice(0, 5000).map((c) => {
    const card = c as Record<string, unknown>;
    return {
      ygoId: Number(card.ygoId) || 0,
      name: String(card.name ?? "").slice(0, 200),
      qty: Math.max(1, Math.min(99, Number(card.qty) || 1)),
      setCode: card.setCode ? String(card.setCode).slice(0, 40) : undefined,
      rarity: card.rarity ? String(card.rarity).slice(0, 60) : undefined,
      price: Math.max(0, Number(card.price) || 0),
      imageSmall: String(card.imageSmall ?? "").slice(0, 500),
      cardType: String(card.cardType ?? "").slice(0, 60),
      frameType: String(card.frameType ?? "").slice(0, 40),
      attribute: card.attribute ? String(card.attribute).slice(0, 30) : undefined,
      race: card.race ? String(card.race).slice(0, 60) : undefined,
      archetype: card.archetype ? String(card.archetype).slice(0, 120) : undefined,
      setName: card.setName ? String(card.setName).slice(0, 200) : undefined,
    };
  });
  await Vault.findOneAndUpdate(
    { userId: session.userId },
    { $set: { cards } },
    { upsert: true, new: true }
  );
  return NextResponse.json({ ok: true, count: cards.length });
}
