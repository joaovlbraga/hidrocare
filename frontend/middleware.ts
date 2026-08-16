/**
 * Copyright (c) 2026 João Vitor de Lima Pellegrini Braga. All rights reserved.
 * This software is the confidential and proprietary information of João Vitor de Lima Pellegrini Braga.
 * System: HidroCare
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Routes that require the user to be authenticated.
 */
const PROTECTED_ROUTES = ["/", "/pacientes", "/registros", "/usuarios"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // Auth token lives in sessionStorage (client-side only), so server-side
  // middleware cannot read it. Allow the request and let client code redirect
  // to /login on 401. Migrate to httpOnly cookies to enable server-side guards.
  return NextResponse.next();
}

/**
 * Matcher — explicitly EXCLUDES Next.js internals and static assets so that
 * middleware never intercepts _next/static chunks (which would cause 403s).
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\.ico|api/|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|otf|map)$).*)",
  ],
};
