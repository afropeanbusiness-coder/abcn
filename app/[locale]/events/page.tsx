"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import LogoMarquee from "@/components/LogoMarquee";
import { neon } from "@/lib/neon";
import { EventRecord, FIALI_FALLBACK, fallbackEvent, normaliseEvent } from "@/lib/events";
import Img from "@/components/Img";

export default function EventsPage() {
  const locale = useLocale();
  const t = useTranslations("eventsList");
  const tn = useTranslations("nav");
  const [events, setEvents] = useState<EventRecord[]>([fallbackEvent(locale)]);

  useEffect(() => {
    let live = true;
    setEvents([fallbackEvent(locale)]);

    // Fetch directly from /api/events for instant Postgres reads
    fetch("/api/events")
      .then((res) => res.json())
      .then((json) => {
        if (live && json?.data?.length) {
          setEvents(json.data.map((row: any) => normaliseEvent(row, locale)));
          return;
        }
        throw new Error("No events from API");
      })
      .catch(() => {
        // Fallback to neon client
        neon
          .from("events")
          .select("*")
          .eq("status", "published")
          .order("priority", { ascending: false })
          .then(
            ({ data }) => {
              if (live && data?.length)
                setEvents(data.map((row) => normaliseEvent(row as Partial<EventRecord>, locale)));
            },
            () => {}
          );
      });

    return () => {
      live = false;
    };
  }, [locale]);

  return (
    <main className="events-shell">
      <header className="events-nav">
        <Link className="events-brand" href="/">ABCN <small>Afropean Business & Culture Network</small></Link>
        <nav className="events-navlinks">
          <Link href="/">{t("navHome")}</Link>
          <Link href="/about">{tn("ourStory")}</Link>
          <Link href="/events">{tn("events")}</Link>
          <Link href={{ pathname: "/", hash: "join" }}>{tn("joinUs")}</Link>
        </nav>
      </header>

      <section className="events-hero">
        <span className="eyeline">{t("eyeline")}</span>
        <h1>{t("heroTitle1")}<br/><em>{t("heroTitle2")}</em></h1>
        <p>{t("heroLead")}</p>
      </section>

      <section className="events-container">
        <div className="events-head">
          <h2>{t("headTitle")}</h2>
          <p>{t("headLead")}</p>
        </div>

        <div className="event-grid">
          {events.map((event, index) => (
            <article key={event.id || event.slug} className={"event-card " + ((event.featured || index === 0) ? "featured" : "")}>
              <div className="event-image">
                <Img
                  src={event.card_image_url || event.hero_image_url || FIALI_FALLBACK.card_image_url || ""}
                  alt={event.title}
                  fill
                  priority={index === 0}
                  sizes="(max-width: 900px) 100vw, 50vw"
                />
                {event.featured && <span className="event-badge">{t("featured")}</span>}
              </div>
              <div className="event-body">
                <span className="event-meta">{event.eyebrow || event.date_label || t("fallbackMeta")}</span>
                <h3>{event.title}</h3>
                <p>{event.short_description}</p>
                <Link className="event-link" href={{ pathname: "/events/[slug]", params: { slug: event.slug } }}>{t("details")} &rarr;</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <LogoMarquee
        theme="light"
        speed="slow"
        label={t("partnersLabel")}
        tagline={t("partnersTagline")}
      />

      <footer className="events-footer">
        <strong>ABCN</strong>
        <span>{t("footerCreed")}</span>
      </footer>
    </main>
  );
}
