import { NextResponse } from "next/server";
import { AUTH_COOKIE, deriveToken, safeEqual } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Exchanges the shared password for a signed cookie. */
export async function POST(request: Request) {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) {
    return NextResponse.json({ error: "Login is not configured." }, { status: 503 });
  }

  const form = await request.formData();
  const submitted = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/dashboard");

  if (!safeEqual(submitted, password)) {
    const retry = new URL("/login", request.url);
    retry.searchParams.set("error", "1");
    retry.searchParams.set("next", next);
    return NextResponse.redirect(retry, { status: 303 });
  }

  // Only redirect to paths inside this app — an absolute URL here would be an
  // open redirect, letting a crafted link bounce a signed-in user offsite.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  const response = NextResponse.redirect(new URL(safeNext, request.url), { status: 303 });
  response.cookies.set({
    name: AUTH_COOKIE,
    value: await deriveToken(password),
    httpOnly: true, // unreadable from JavaScript, so XSS cannot steal it
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
