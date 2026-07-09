import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isSetup = pathname.startsWith("/setup");
  const isApi = pathname.startsWith("/api");

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
