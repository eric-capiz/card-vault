import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

/** Routes that require a logged-in user. */
const PROTECTED_PREFIXES = ["/vault", "/dashboard", "/decks"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

async function hasValidSession(req: NextRequest): Promise<boolean> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  const token = req.cookies.get("card-vault-session")?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  if (!isProtected(req.nextUrl.pathname)) {
    return NextResponse.next();
  }
  // Auth not configured — let the page render its "not set up" notice.
  if (!process.env.MONGODB_URI || !process.env.SESSION_SECRET) {
    return NextResponse.next();
  }
  if (!(await hasValidSession(req))) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
