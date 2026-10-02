import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { toGermanPath } from "./lib/locale-redirect";
import { DEFAULT_SITE_URL, siteUrl } from "./lib/legal";

const intlMiddleware = createMiddleware(routing);

/**
 * The one host every other domain redirects to.
 *
 * Taken from siteUrl, which is also what the sitemap, canonical tags, hreflang
 * and JSON-LD are built from. These used to be independent - the middleware
 * redirected to www.afropeanbusiness.com while siteUrl fell back to the
 * non-existent abcn.network - so the site told search engines its canonical
 * home was a dead domain while bouncing every visitor somewhere else. One
 * value now feeds both.
 */
const CANONICAL_HOST = (() => {
  try {
    return new URL(siteUrl).host.toLowerCase();
  } catch {
    return new URL(DEFAULT_SITE_URL).host.toLowerCase();
  }
})();

export default function middleware(request: NextRequest) {
  const host = (
    request.headers.get("x-forwarded-host") ||
    request.nextUrl.hostname ||
    request.headers.get("host") ||
    ""
  ).toLowerCase().replace(/:\d+$/, "");

  const { pathname, search } = request.nextUrl;

  // Skip API routes, Next internal assets, and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/assets") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 1. Any request arriving on a .de domain (afropeanbusiness.de, abcn.de, ...)
  //    lands on the German site in a single hop. toGermanPath resolves the
  //    localized slug - /events becomes /de/veranstaltungen directly, rather
  //    than /de/events and a second redirect from next-intl.
  if (host.endsWith(".de")) {
    return NextResponse.redirect(
      new URL(`${toGermanPath(pathname)}${search}`, `https://${CANONICAL_HOST}`),
      301
    );
  }

  // 2. Any other alternate domain (e.g. afropeanbusinessnetwork.com, .store, .global)
  // that points directly to this Vercel deployment instead of the canonical domain
  const isExcludedHost =
    !host ||
    host === CANONICAL_HOST ||
    host === "localhost" ||
    host.endsWith(".vercel.app");

  if (!isExcludedHost) {
    return NextResponse.redirect(
      new URL(`${pathname}${search}`, `https://${CANONICAL_HOST}`),
      301
    );
  }

  return intlMiddleware(request);
}

export const config = {
  // Match the root, any explicitly-prefixed locale path, and every other path
  // that is not a Next internal, an API route or a static file.
  matcher: [
    "/",
    "/(de|en)/:path*",
    "/((?!api|_next|_vercel|assets|.*\\..*).*)",
  ],
};
