import { type NextRequest, NextResponse } from "next/server";
import { LANDING } from "./lib/routes";

const PUBLIC = ["/", "/sign-in", "/sign-up"];
const AUTH_PAGES = ["/sign-in", "/sign-up"];

/** Cheap gate on cookie presence. The API is the source of truth and answers 401 for stale cookies. */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const signedIn = req.cookies.has("seam_access") || req.cookies.has("seam_refresh");
  if (!signedIn && !PUBLIC.includes(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", `${pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(url);
  }
  // reason=expired means the client already knows the session is dead, whatever cookies remain
  if (signedIn && AUTH_PAGES.includes(pathname) && req.nextUrl.searchParams.get("reason") !== "expired") {
    return NextResponse.redirect(new URL(LANDING, req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"] };
