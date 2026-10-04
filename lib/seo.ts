import type { Metadata } from "next";
import { getPathname, routing, type AppPathname, type Locale } from "@/i18n/routing";
import { siteUrl } from "@/lib/legal";

/**
 * Single source of truth for the URLs the site advertises to search engines.
 *
 * Canonicals, hreflang alternates and the sitemap are all derived from the
 * localized pathnames in i18n/routing.ts, so a German slug is defined once and
 * can never drift out of sync with what actually resolves. (The sitemap used to
 * hardcode /de/ueber-uns and /de/veranstaltungen, neither of which existed.)
 */

export type Href =
  | AppPathname
  | { pathname: AppPathname; params: Record<string, string> };

/**
 * The picture shown when a link is shared (WhatsApp, LinkedIn, Facebook, X).
 * Replace public/assets/abcn/share-fiali.jpg (1200x630) to change it everywhere.
 */
export const SHARE_IMAGE = {
  url: "/assets/abcn/share-fiali.jpg",
  width: 1200,
  height: 630,
  alt: "ABCN - Female Innovation & Afropean Leadership Initiative",
};

/** Locale-prefixed, localized path for a route, e.g. /de/veranstaltungen/x. */
export function pathFor(href: Href, locale: Locale): string {
  return getPathname({ href, locale } as never);
}

/** Absolute URL for a route in one locale. */
export function urlFor(href: Href, locale: Locale): string {
  const path = pathFor(href, locale);
  return siteUrl + (path === "/" ? "" : path);
}

/**
 * Canonical + hreflang block for a page. x-default points at the English URL,
 * which is what Google serves to users outside the de-DE targeting.
 */
export function alternatesFor(href: Href, locale: Locale): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = pathFor(href, l);
  languages["x-default"] = pathFor(href, routing.defaultLocale);

  return { canonical: pathFor(href, locale), languages };
}

/** Every locale variant of a route, for sitemap entries. */
export function sitemapEntry(
  href: Href,
  opts: {
    priority: number;
    changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
    lastModified?: Date;
  }
) {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = urlFor(href, l);

  return routing.locales.map((locale) => ({
    url: urlFor(href, locale),
    lastModified: opts.lastModified ?? new Date(),
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
    // Google reads sitemap-level hreflang as well as the in-page tags.
    alternates: { languages },
  }));
}
