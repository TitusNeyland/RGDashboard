import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, isValidToken } from "@/lib/auth";

/**
 * Password gate (Next 16 `proxy.ts`, the successor to `middleware.ts`).
 *
 * FAILS CLOSED IN PRODUCTION. If DASHBOARD_PASSWORD is not set on a
 * production deployment, every route is blocked rather than served — the
 * dangerous failure here is silently publishing real seller data because an
 * environment variable was forgotten, not an outage.
 *
 * Local development without the variable stays open, so `npm run dev` is
 * unchanged.
 *
 * This never runs on the GitHub Pages build: static export has no server, and
 * scripts/prepare-static-demo.mjs deletes this file. That demo contains only
 * mock data, so it needs no gate.
 */
export async function proxy(request: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;

  if (!password) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse(
        "DASHBOARD_PASSWORD is not set. Refusing to serve real data unprotected. " +
          "Set it in your hosting provider's environment variables and redeploy.",
        { status: 503, headers: { "content-type": "text/plain" } }
      );
    }
    return NextResponse.next();
  }

  if (await isValidToken(request.cookies.get(AUTH_COOKIE)?.value, password)) {
    return NextResponse.next();
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  /**
   * Everything except the login screen, its API route, Next's own assets and
   * the favicon. Without excluding assets the redirect would also block CSS
   * and JS, leaving an unstyled login page.
   */
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
