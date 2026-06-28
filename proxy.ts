import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { getSessionCookie } from "better-auth/cookies";

import { routing } from "@/lib/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const AUTH_GATED_SEGMENTS = [
  "app",
  "account",
  "editor",
  "admin",
  "organization",
  "watch",
  "discover",
];

const LOCALES = routing.locales as readonly string[];

function isAuthGated(pathname: string) {
  const segs = pathname.split("/").filter(Boolean);
  // Strip a leading locale segment (e.g. /tr/app/... → app) so the gate matches
  // localized URLs, not just the unprefixed default-locale ones.
  const first = segs[0] && LOCALES.includes(segs[0]) ? segs[1] : segs[0];
  return !!first && AUTH_GATED_SEGMENTS.includes(first);
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAuthGated(pathname)) {
    const sessionCookie = getSessionCookie(request);
    if (!sessionCookie) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
