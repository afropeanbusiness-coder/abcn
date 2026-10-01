import path from "path";
import { fileURLToPath } from "url";
import createNextIntlPlugin from "next-intl/plugin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
// NOTE: the GitHub Pages static-export branch is incompatible with the
// locale middleware (middleware does not run in a static export). The Pages
// workflow is already disabled in favour of Vercel, so this branch is dead
// today; if it is ever revived, locale routing will need prerendered
// /en and /de paths instead of middleware negotiation.
const onGitHubPages = process.env.GITHUB_PAGES === "true";

/**
 * Response headers.
 *
 * HSTS is the piece that makes "the site uses SSL" actually true: without it a
 * first visit over http:// is still answered in the clear before any redirect.
 * The rest are the low-cost hardening headers a German security review expects
 * to find, and none of them require a third-party service.
 */
const securityHeaders = [
  {
    // Two years, subdomains included, preload-eligible.
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Send only the origin cross-site, so paths a visitor viewed do not leak.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    // The site uses none of these; deny them rather than inherit browser defaults.
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  outputFileTracingRoot: __dirname,

  images: {
    /**
     * AVIF first, WebP as the fallback. This is what turns the multi-megabyte
     * source photographs into the ~40-80 KB the browser actually downloads,
     * which is the single biggest lever on LCP for this site.
     */
    formats: ["image/avif", "image/webp"],
    // Optimised variants stay cached for a year; the sources are content-hashed.
    minimumCacheTTL: 31_536_000,
  },

  ...(onGitHubPages
    ? {
        output: "export",
        basePath: "/abcn",
        assetPrefix: "/abcn/",
        trailingSlash: true,
      }
    : {
        // headers() is unsupported in a static export, hence the branch.
        async headers() {
          return [{ source: "/:path*", headers: securityHeaders }];
        },
      }),
};

export default withNextIntl(nextConfig);
