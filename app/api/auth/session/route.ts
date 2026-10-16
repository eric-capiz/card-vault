import { NextResponse } from "next/server";
import { destroySession, getSession } from "@/lib/auth";

export async function POST() {
  await destroySession();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({ user: { email: session.email } });
}
