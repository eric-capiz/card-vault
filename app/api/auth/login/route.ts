import { connectDB } from "@/lib/mongodb";
import { createSession, verifyPassword } from "@/lib/auth";
import { sessionCookieHeader } from "@/lib/auth";
import { User } from "@/models/User";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    login?: string;
    password?: string;
  };
  const login = (body.login ?? "").trim();
  const password = body.password ?? "";
  if (!login || !password) {
    return Response.json({ error: "Enter a username and password." }, { status: 400 });
  }
  await connectDB();
  // Prefer an exact username match, then email, then display name — so a
  // notebook account always wins over a same-named record from another app,
  // and records from other apps still work here, untouched.
  const user =
    (await User.findOne({ username: login })) ??
    (await User.findOne({ email: login.toLowerCase() })) ??
    (await User.findOne({ name: login }));
  if (!user) {
    return Response.json({ error: "Invalid login." }, { status: 401 });
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return Response.json({ error: "Invalid login." }, { status: 401 });
  }
  const token = await createSession(String(user._id));
  const display = user.username || user.email || user.name || "User";
  return Response.json(
    { user: { _id: String(user._id), display } },
    { headers: { "Set-Cookie": sessionCookieHeader(token) } },
  );
}
