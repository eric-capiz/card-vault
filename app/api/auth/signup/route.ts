import { NextRequest, NextResponse } from "next/server";
import { connectDB, isDBConfigured } from "@/lib/mongodb";
import { User } from "@/models/User";
import { createSession, hashPassword, isAuthConfigured } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: "Auth is not configured (MONGODB_URI / SESSION_SECRET missing)." },
      { status: 503 }
    );
  }
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }
  try {
    await connectDB();
    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 }
      );
    }
    const passwordHash = await hashPassword(password);
    const user = await User.create({ email, passwordHash });
    await createSession(user._id.toString(), user.email);
    return NextResponse.json({ ok: true, email: user.email });
  } catch (err) {
    console.error("[auth/signup]", err);
    return NextResponse.json({ error: "Could not create account." }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ configured: isDBConfigured() });
}
