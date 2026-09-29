import type { EventRecord } from "@/lib/events";
import { siteUrl } from "@/lib/legal";
import { urlFor } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

/**
 * Schema.org structured data.
 *
 * Google only awards event rich results (the date/location block that appears
 * under a result, and inclusion in Google's event listings) when an Event has
 * at minimum a name, a startDate and a location. Emitting an Event without a
 * confirmed start date is worse than emitting nothing: it earns a Search
 * Console error rather than a rich result. buildEventJsonLd therefore returns
 * null while an event's dates are still "to be announced".
 */

const ORG_ID = siteUrl + "/#organization";
const SITE_ID = siteUrl + "/#website";

/** Schema.org wants an ISO 3166-1 country code where we store a display name. */
const COUNTRY_CODES: Record<string, string> = {
  germany: "DE",
  deutschland: "DE",
  france: "FR",
  frankreich: "FR",
  netherlands: "NL",
  niederlande: "NL",
  belgium: "BE",
  belgien: "BE",
  austria: "AT",
  "österreich": "AT",
  switzerland: "CH",
  schweiz: "CH",
};

function countryCode(country?: string | null): string | undefined {
  if (!country) return undefined;
  const key = country.trim().toLowerCase();
  if (/^[a-z]{2}$/.test(key)) return key.toUpperCase();
  return COUNTRY_CODES[key] ?? country;
}

function absolute(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return siteUrl + (url.startsWith("/") ? url : "/" + url);
}

export function buildOrganizationJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: "Afropean Business & Culture Network",
    alternateName: "ABCN",
    url: siteUrl,
    logo: absolute("/assets/abcn/abcn-emblem.png"),
    description:
      locale === "de"
        ? "Netzwerk für afropäische Wirtschaft und Kultur: Gründerinnenprogramme, kulturelle Räume und grenzüberschreitende Begegnungen in Deutschland und Europa."
        : "Afropean business and culture network: founder programmes, cultural rooms and cross-border gatherings across Germany and Europe.",
    areaServed: [
      { "@type": "Country", name: "Germany" },
      { "@type": "Place", name: "Europe" },
    ],
    sameAs: ["https://www.instagram.com/afropeanbusinessnetwork/"],
  };
}

export function buildWebSiteJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": SITE_ID,
    url: siteUrl,
    name: "Afropean Business & Culture Network",
    inLanguage: locale === "de" ? "de-DE" : "en-GB",
    publisher: { "@id": ORG_ID },
  };
}

/** Event rich-result markup, or null when the event has no confirmed dates. */
export function buildEventJsonLd(event: EventRecord, locale: Locale) {
  if (!event.start_at) return null;

  const url = urlFor({ pathname: "/events/[slug]", params: { slug: event.slug } }, locale);
  const image = absolute(event.hero_image_url || event.card_image_url);

  const hasPlace = Boolean(event.venue || event.city);

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": url + "#event",
    name: event.title,
    description: event.short_description || event.description,
    startDate: event.start_at,
    ...(event.end_at ? { endDate: event.end_at } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...(image ? { image: [image] } : {}),
    ...(hasPlace
      ? {
          location: {
            "@type": "Place",
            name: event.venue || event.city,
            address: {
              "@type": "PostalAddress",
              ...(event.city ? { addressLocality: event.city } : {}),
              ...(countryCode(event.country) ? { addressCountry: countryCode(event.country) } : {}),
            },
          },
        }
      : {}),
    organizer: {
      "@type": "Organization",
      name: event.organizer || "Afropean Business & Culture Network",
      url: siteUrl,
    },
    inLanguage: locale === "de" ? "de-DE" : "en-GB",
    url,
    ...(event.registration_url
      ? {
          offers: {
            "@type": "Offer",
            url: event.registration_url,
            price: 0,
            priceCurrency: "EUR",
            availability: event.application_open
              ? "https://schema.org/InStock"
              : "https://schema.org/SoldOut",
          },
        }
      : {}),
  };
}

export function buildBreadcrumbJsonLd(
  trail: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * FAQPage markup for the event FAQ.
 *
 * Note on expectations: since Google's August 2023 change, FAQ rich results
 * are shown almost exclusively for authoritative government and health sites,
 * so this will not add an expandable block to ABCN's search listing. It is
 * still worth emitting - it states the question/answer structure explicitly
 * for the assistants and answer engines that increasingly read pages this way,
 * and it costs nothing at runtime.
 */
export function buildFaqJsonLd(
  entries: { question: string; answer: string }[]
) {
  if (entries.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };
}
