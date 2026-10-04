import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Plus_Jakarta_Sans, Newsreader } from "next/font/google";
import { routing, type Locale } from "@/i18n/routing";
import { siteUrl } from "@/lib/legal";
import { alternatesFor, SHARE_IMAGE } from "@/lib/seo";
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from "@/lib/structured-data";
import JsonLd from "@/components/JsonLd";
import "../globals.css";
import "../benchmark-components.css";
import GdprModal from "@/components/GdprModal";
import CookieBanner from "@/components/CookieBanner";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

  return {
    metadataBase: new URL(siteUrl),
    applicationName: "ABCN",
    title: t("title"),
    description: t("description"),
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: t("title"),
      description: t("ogDescription"),
      type: "website",
      url: locale === "de" ? "/de" : "/",
      siteName: "Afropean Business & Culture Network",
      locale: locale === "de" ? "de_DE" : "en_GB",
      alternateLocale: locale === "de" ? ["en_GB"] : ["de_DE"],
      images: [SHARE_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("ogDescription"),
      images: [SHARE_IMAGE.url],
    },
    alternates: alternatesFor("/", locale as Locale),
    verification: googleVerification ? { google: googleVerification } : undefined,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Required for static rendering of the locale segment.
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${plusJakartaSans.variable} ${newsreader.variable}`}>
      <body>
        <JsonLd data={buildOrganizationJsonLd(locale as Locale)} />
        <JsonLd data={buildWebSiteJsonLd(locale as Locale)} />
        <NextIntlClientProvider>
          {children}
          <GdprModal />
          <CookieBanner />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
