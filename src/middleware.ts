import { NextRequest, NextResponse } from "next/server";

// Basic-auth protects the dashboard and data APIs.
// Cron endpoints use CRON_SECRET; unsubscribe + OAuth callback stay public.
const PUBLIC = ["/api/cron", "/api/unsubscribe", "/api/auth/google"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) return NextResponse.next(); // no password configured

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const [, pass] = atob(auth.slice(6)).split(":");
    if (pass === password) return NextResponse.next();
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="MBP Origination"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
