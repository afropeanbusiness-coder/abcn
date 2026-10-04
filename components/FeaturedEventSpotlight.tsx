"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { neon } from "@/lib/neon";
import { EventRecord, FIALI_FALLBACK, fallbackEvent, normaliseEvent } from "@/lib/events";
import LogoMarquee from "@/components/LogoMarquee";
import { applicationState } from "@/lib/application-status";
import styles from "./FeaturedEventSpotlight.module.css";

function renderEventTitle(title: string) {
  if (!title) return null;
  if (title.includes("\n")) {
    return title.split("\n").map((line, i, arr) => (
      <span key={i}>
        {line}
        {i < arr.length - 1 && <br />}
      </span>
    ));
  }
  if (/Female Innovation/i.test(title) && /Afropean Leadership/i.test(title)) {
    return (
      <>
        Female Innovation<br />
        <em>Afropean Leadership</em><br />
        Initiative
      </>
    );
  }
  if (/Führungsinitiative/i.test(title)) {
    return (
      <>
        Innovations- &<br />
        <em>Führungsinitiative</em><br />
        für afropäische Frauen
      </>
    );
  }
  return title;
}

export default function FeaturedEventSpotlight() {
  const locale = useLocale();
  const t = useTranslations("spotlight");
  const [event, setEvent] = useState<EventRecord>(() => fallbackEvent(locale));

  useEffect(() => {
    let live = true;
    setEvent(fallbackEvent(locale));

    // Fetch directly from /api/events for instant Postgres reads
    fetch("/api/events?show_on_home=true&limit=1")
      .then((res) => res.json())
      .then((json) => {
        if (live && json?.data?.[0]) {
          setEvent(normaliseEvent(json.data[0], locale));
          return;
        }
        throw new Error("No homepage event from API");
      })
      .catch(() => {
        // Fallback to neon client
        neon
          .from("events")
          .select("*")
          .eq("status", "published")
          .eq("show_on_home", true)
          .order("priority", { ascending: false })
          .limit(1)
          .then(
            ({ data }) => {
              if (live && data?.[0]) setEvent(normaliseEvent(data[0] as Partial<EventRecord>, locale));
            },
            () => {}
          );
      });

    return () => {
      live = false;
    };
  }, [locale]);

  const isFiali = event.slug === FIALI_FALLBACK.slug;
  const factItems: [string, string][] =
    event.highlights && event.highlights.length > 0
      ? event.highlights.slice(0, 4).map((item, index) => {
          const match = item.match(/^([\d–-]+\+?|\b[A-Za-z0-9&]{1,10}\b)\s*·?\s*(.+)$/);
          if (match && match[1] && match[2]) {
            return [match[1], match[2]];
          }
          return [String(index + 1).padStart(2, "0"), item];
        })
      : [
          [t("fact1Value"), t("fact1Label")],
          [t("fact2Value"), t("fact2Label")],
          [t("fact3Value"), t("fact3Label")],
          [t("fact4Value"), t("fact4Label")],
        ];

  return (
    <section className={styles.wrap} id="featured-event" aria-label={t("ariaLabel")}>
      <div className={styles.topline}>
        <span className={styles.kicker}>{event.eyebrow || t("kicker")}</span>
        <span className={styles.date}>{event.date_label || t("dateFallback")}</span>
      </div>
      <div className={styles.grid}>
        <h2 className={styles.title}>
          {renderEventTitle(event.title)}
        </h2>
        <div className={styles.copy}>
          <p>{event.short_description}</p>
          <div className={styles.actions}>
            {event.application_open && applicationState(event) === "open" ? (
              <Link className={styles.primary} href={{ pathname: "/events/[slug]", params: { slug: event.slug }, hash: "apply" }}>
                {event.application_cta || t("applyNow")} →
              </Link>
            ) : (
              <Link className={styles.primary} href={{ pathname: "/events/[slug]", params: { slug: event.slug } }}>{t("exploreGeneric")} →</Link>
            )}
            <Link className={styles.secondary} href={{ pathname: "/events/[slug]", params: { slug: event.slug } }}>{t("programmeDetails")}</Link>
          </div>
          {event.application_deadline && <div className={styles.urgency}>{event.application_deadline}</div>}
        </div>
      </div>
      {/* Transparent Scrolling Logo Marquee */}
      <div style={{ marginTop: "44px", position: "relative", zIndex: 2 }}>
        <LogoMarquee
          logos={event.partners && event.partners.length > 0 ? event.partners : undefined}
          theme="dark"
          speed="normal"
          label={t("partnerLabel")}
          tagline={event.venue || event.city || t("partnerTagline")}
        />
      </div>
      {factItems.length > 0 && (
        <div className={styles.facts}>
          {factItems.map(([value, label]) => (
            <div className={styles.fact} key={value + label}><strong>{value}</strong><span>{label}</span></div>
          ))}
        </div>
      )}
    </section>
  );
}
