import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isSetup = pathname.startsWith("/setup");
  const isApi = pathname.startsWith("/api");

  // Setup gate: redirect to /setup until the wizard has been completed.
  // Completion is tracked via the `__session` cookie set by /api/config POST.
  // (Firebase Hosting only forwards a cookie named `__session`.)
  if (!isSetup && !isApi) {
    const sess = req.cookies.get("__session")?.value || "";
    if (!sess.includes("setup=1")) {
      const url = req.nextUrl.clone();
      url.pathname = "/setup";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// Protect everything except Next.js internals and static assets (incl. the
// generated favicon icon.svg and the brand logo).
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.jpeg|icon.png|icon.svg|risa-logo-white.png).*)"],
};
