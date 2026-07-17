import { NextRequest, NextResponse } from "next/server";

const API_INTERNAL_URL =
  process.env.API_INTERNAL_URL || "http://localhost:8000";

const ACCESS_COOKIE = process.env.ACCESS_COOKIE_NAME || "veevra_access";
const REFRESH_COOKIE = process.env.REFRESH_COOKIE_NAME || "veevra_refresh";

// `/design` is the static design-system reference (no data, no auth needed).
// `/wallboard` is kiosk mode: it renders under the registered workspace Application
// identity (scoped, deny-by-default) — AICP grants govern what it can load.
const PUBLIC_PATHS = ["/login", "/design", "/wallboard"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static assets, API proxy, and Next internals pass through.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const hasAccess = req.cookies.has(ACCESS_COOKIE);
  const hasRefresh = req.cookies.has(REFRESH_COOKIE);

  if (isPublic(pathname)) {
    // Already authenticated users skip the login page.
    if (pathname === "/login" && hasAccess) {
      return NextResponse.redirect(new URL("/workspace", req.url));
    }
    return NextResponse.next();
  }

  if (hasAccess) {
    return NextResponse.next();
  }

  // Access token expired but a refresh token exists: rotate server-side and
  // forward the new Set-Cookie headers to the browser.
  if (hasRefresh) {
    const refreshed = await fetch(`${API_INTERNAL_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { cookie: req.headers.get("cookie") ?? "" },
    });
    if (refreshed.ok) {
      // Attach the rotated cookies and redirect to the same URL so the page
      // render runs with the fresh access cookie (not the just-expired one).
      const res = NextResponse.redirect(req.url);
      const setCookie = refreshed.headers.getSetCookie?.() ?? [];
      for (const c of setCookie) {
        res.headers.append("set-cookie", c);
      }
      return res;
    }
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
