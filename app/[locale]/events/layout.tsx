import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { alternatesFor, SHARE_IMAGE, urlFor } from "@/lib/seo";
import "./events.css";

/**
 * Locale-aware metadata. Without it this page inherited the root layout's
 * canonical and pointed at the homepage, which reads to a crawler as "this
 * listing is a duplicate of /" and keeps it out of the index.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    title: t("eventsTitle"),
    description: t("eventsDescription"),
    alternates: alternatesFor("/events", locale as Locale),
    openGraph: {
      title: t("eventsTitle"),
      description: t("eventsOgDescription"),
      type: "website",
      url: urlFor("/events", locale as Locale),
      siteName: "Afropean Business & Culture Network",
      locale: locale === "de" ? "de_DE" : "en_GB",
      alternateLocale: locale === "de" ? ["en_GB"] : ["de_DE"],
      images: [SHARE_IMAGE],
    },
  };
}

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
