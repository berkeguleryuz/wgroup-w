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

function isAuthGated(pathname: string) {
  const first = pathname.split("/")[1];
  return AUTH_GATED_SEGMENTS.includes(first);
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
