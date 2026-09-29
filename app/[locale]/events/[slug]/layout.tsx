import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { siteUrl } from "@/lib/legal";
import { alternatesFor, urlFor } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";
import { getEventBySlug } from "@/lib/events-server";
import { FIALI_SLUG } from "@/lib/events";
import { buildBreadcrumbJsonLd, buildEventJsonLd, buildFaqJsonLd } from "@/lib/structured-data";
import JsonLd from "@/components/JsonLd";

/**
 * The questions the FAQ actually renders, in display order.
 * Must match FAQ_GROUPS in page.tsx.
 */
const FAQ_QUESTION_KEYS: number[] = [1, 5, 6, 2, 3, 4, 7, 8, 9, 10, 11, 12];

// Literal by requirement: Next reads this without evaluating imports.
// Keep in step with EVENTS_REVALIDATE in lib/events-server.ts.
export const revalidate = 3600;

/**
 * Title, description, social preview and structured data are all read from the
 * event CMS. They used to be hardcoded per slug, so any event beyond the seeded
 * FIALI programme was published with the generic "ABCN Event" title.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const event = await getEventBySlug(slug, locale);
  const de = locale === "de";

  if (!event) {
    return {
      title: de ? "Veranstaltung nicht gefunden | ABCN" : "Event not found | ABCN",
      robots: { index: false, follow: true },
    };
  }

  const title = `${event.title} | ABCN`;
  const description = event.short_description || event.description;
  const image = event.hero_image_url || event.card_image_url || undefined;
  const href = { pathname: "/events/[slug]" as const, params: { slug } };

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: alternatesFor(href, locale as Locale),
    openGraph: {
      title,
      description,
      type: "website",
      url: urlFor(href, locale as Locale),
      siteName: "Afropean Business & Culture Network",
      locale: de ? "de_DE" : "en_GB",
      alternateLocale: de ? ["en_GB"] : ["de_DE"],
      images: image ? [{ url: image, alt: event.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function EventDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const event = await getEventBySlug(slug, locale);
  const t = await getTranslations({ locale, namespace: "nav" });

  // The FAQ is rendered by a client component, so its structured data is built
  // here instead - crawlers read JSON-LD from the server response.
  const te = await getTranslations({ locale, namespace: "event" });
  const faq =
    event?.slug === FIALI_SLUG
      ? buildFaqJsonLd(
          FAQ_QUESTION_KEYS.map((n) => ({
            question: te(`faq${n}Q`),
            answer: te(`faq${n}A`),
          }))
        )
      : null;

  const breadcrumb = event
    ? buildBreadcrumbJsonLd([
        { name: "ABCN", url: urlFor("/", locale as Locale) },
        { name: t("events"), url: urlFor("/events", locale as Locale) },
        {
          name: event.title,
          url: urlFor({ pathname: "/events/[slug]", params: { slug } }, locale as Locale),
        },
      ])
    : null;

  return (
    <>
      {event && <JsonLd data={buildEventJsonLd(event, locale as Locale)} />}
      <JsonLd data={breadcrumb} />
      <JsonLd data={faq} />
      {children}
    </>
  );
}
