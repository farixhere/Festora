import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Optimistic redirect only: it checks that a session cookie EXISTS so
 * signed-out visitors bounce to /sign-in with a return path. It does not
 * validate the session — every dashboard layout, page and server action
 * re-validates against the database.
 */
export function middleware(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/onboarding", "/my-registrations"],
};
