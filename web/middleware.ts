import { NextRequest, NextResponse } from "next/server";

// HTTP Basic Auth gate for the whole dashboard. Credentials can be overridden via env
// (BASIC_AUTH_USER / BASIC_AUTH_PASS); defaults match the agreed login.
const USER = process.env.BASIC_AUTH_USER || "risa-geo";
const PASS = process.env.BASIC_AUTH_PASS || "risa@123";

export function middleware(req: NextRequest) {
  const header = req.headers.get("authorization") || "";
  if (header.startsWith("Basic ")) {
    try {
      const [u, p] = atob(header.slice(6)).split(":");
      if (u === USER && p === PASS) return NextResponse.next();
    } catch { /* fall through to challenge */ }
  }
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="RISA GEO", charset="UTF-8"' },
  });
}

// Protect everything except Next internals and static assets.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|risa-logo-white.png).*)"],
};
