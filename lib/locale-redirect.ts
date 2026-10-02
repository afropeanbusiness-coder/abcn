import { routing } from "@/i18n/routing";

/**
 * Maps an incoming path to its German equivalent, for requests that arrive on
 * a .de domain.
 *
 * The naive version of this prefixed "/de" and stopped, which produced two
 * redirects for every localized route: /events became /de/events, which
 * next-intl then redirected again to /de/veranstaltungen. Resolving the German
 * slug here makes it a single hop, which matters because search engines pass
 * less signal through a redirect chain and every hop is a round trip on a
 * mobile connection.
 *
 * The mapping is derived from routing.pathnames rather than restated, so a new
 * localized route cannot be added without this following it.
 */

type Mapping = { pattern: RegExp; toDe: (match: RegExpMatchArray) => string };

function templateToPattern(template: string): RegExp {
  // "/events/[slug]" -> /^\/events\/([^/]+)$/
  const source = template
    .split("/")
    .map((segment) =>
      segment.startsWith("[") && segment.endsWith("]")
        ? "([^/]+)"
        : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    )
    .join("/");
  return new RegExp(`^${source}$`);
}

function fillTemplate(template: string, match: RegExpMatchArray): string {
  let index = 1;
  return template
    .split("/")
    .map((segment) =>
      segment.startsWith("[") && segment.endsWith("]") ? match[index++] ?? "" : segment
    )
    .join("/");
}

const MAPPINGS: Mapping[] = Object.values(routing.pathnames).map((value) => {
  const en = typeof value === "string" ? value : value.en;
  const de = typeof value === "string" ? value : value.de;
  return {
    pattern: templateToPattern(en),
    toDe: (match) => fillTemplate(de, match),
  };
});

/**
 * The German URL for a path, including the /de prefix.
 * Paths already under /de are returned unchanged; unknown paths fall back to a
 * plain /de prefix rather than 404ing.
 */
export function toGermanPath(pathname: string): string {
  if (pathname === "/de" || pathname.startsWith("/de/")) return pathname;

  const normalised = pathname === "" ? "/" : pathname;

  for (const mapping of MAPPINGS) {
    const match = normalised.match(mapping.pattern);
    if (match) {
      const dePath = mapping.toDe(match);
      return dePath === "/" ? "/de" : `/de${dePath}`;
    }
  }

  return normalised === "/" ? "/de" : `/de${normalised}`;
}
