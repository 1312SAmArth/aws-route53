import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "r53_session";

/**
 * Optimistic gate: no session cookie means no point rendering the console shell.
 * The real check is the server-side session lookup in <AuthGate>; a stale cookie is caught there.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const login = new URL("/login", request.url);
  const { pathname, search } = request.nextUrl;
  if (pathname !== "/") login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except the login page, API proxy and static assets.
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico).*)"],
};
