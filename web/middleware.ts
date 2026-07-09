import { NextRequest, NextResponse } from "next/server";

// HTTP Basic Auth gate.
const USER = process.env.BASIC_AUTH_USER || "risa-geo";
const PASS = process.env.BASIC_AUTH_PASS || "risa@123";

function basicAuth(req: NextRequest): boolean {
  const header = req.headers.get("authorization") || "";
  if (!header.startsWith("Basic ")) return false;
  try {
    const [u, p] = atob(header.slice(6)).split(":");
    return u === USER && p === PASS;
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isSetup = pathname.startsWith("/setup");
  const isApi = pathname.startsWith("/api");

  // Basic auth — skip for the /setup pages so the wizard loads cleanly.
  if (!isSetup && !basicAuth(req)) {
    return new NextResponse("Authentication required.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="RISA GEO", charset="UTF-8"' },
    });
  }

  // Setup gate: redirect to /setup until the wizard has been completed.
  // Completion is tracked via a cookie set by /api/config POST.
  if (!isSetup && !isApi) {
    const done = req.cookies.get("geo_setup_done")?.value;
    if (!done) {
      const url = req.nextUrl.clone();
      url.pathname = "/setup";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// Protect everything except Next.js internals and static assets.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|risa-logo-white.png).*)"],
};
