import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { User } from "@/models/User";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ user: null });
  await connectDB();
  const user = await User.findById(session.userId);
  if (!user) return Response.json({ user: null });
  return Response.json({
    user: {
      _id: String(user._id),
      display: user.username || user.email || user.name || "User",
    },
  });
}
