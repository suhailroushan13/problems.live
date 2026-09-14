import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "pl_session";

/**
 * Cheap pre-check for routes that are meaningless without an identity. It only
 * looks for the presence of a session cookie so it can issue a real 307 before
 * any rendering work happens — the cookie's *validity*, and every authorisation
 * decision, is still verified server-side in the page and in each Server Action.
 *
 * Next 16 renamed this convention from `middleware` to `proxy`.
 */
const PROTECTED = [
  "/problems/new",
  "/notifications",
  "/settings",
  "/admin",
];

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const needsSession =
    PROTECTED.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    ) || pathname.endsWith("/edit");

  if (!needsSession) return NextResponse.next();
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const signIn = new URL("/api/auth/google", request.url);
  signIn.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(signIn, 307);
}

export const config = {
  matcher: [
    "/problems/new",
    "/problems/:slug/edit",
    "/notifications/:path*",
    "/settings/:path*",
    "/admin/:path*",
  ],
};
