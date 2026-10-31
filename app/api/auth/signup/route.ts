import { connectDB, toPlain } from "@/lib/mongodb";
import { createSession, hashPassword, sessionCookieHeader } from "@/lib/auth";
import { User } from "@/models/User";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
  };
  const username = (body.username ?? "").trim();
  const password = body.password ?? "";
  if (username.length < 2 || username.length > 32) {
    return Response.json({ error: "Username must be 2–32 characters." }, { status: 400 });
  }
  if (password.length < 4) {
    return Response.json({ error: "Password must be at least 4 characters." }, { status: 400 });
  }
  await connectDB();
  // Only ever checks for a collision — never modifies or deletes anyone.
  const taken = await User.findOne({ username });
  if (taken) {
    return Response.json({ error: "That username is already taken." }, { status: 409 });
  }
  const user = await User.create({
    username,
    passwordHash: await hashPassword(password),
  });
  const token = await createSession(String(user._id));
  return Response.json(
    { user: toPlain({ _id: user._id, username: user.username }) },
    { headers: { "Set-Cookie": sessionCookieHeader(token) } },
  );
}
