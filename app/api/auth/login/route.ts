import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { createSession, isAuthConfigured, verifyPassword } from "@/lib/auth";

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
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }
  try {
    await connectDB();
    const user = await User.findOne({ email });
    // Same error for missing user vs wrong password — don't leak which emails exist.
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }
    await createSession(user._id.toString(), user.email);
    return NextResponse.json({ ok: true, email: user.email });
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json({ error: "Could not log in." }, { status: 500 });
  }
}
