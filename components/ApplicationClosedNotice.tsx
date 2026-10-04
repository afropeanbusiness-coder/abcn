"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatBerlin, type ApplicationState } from "@/lib/application-status";

/**
 * Shown in place of the application form when an event is not taking
 * applications (closed, full, or not open yet).
 */
export default function ApplicationClosedNotice({
  state,
  opensAt,
  closesAt,
  message,
  message_de,
}: {
  state: Exclude<ApplicationState, "open" | "off">;
  opensAt?: string | null;
  closesAt?: string | null;
  message?: string | null;
  message_de?: string | null;
}) {
  const t = useTranslations("event");
  const locale = useLocale();
  const custom = (locale === "de" && message_de?.trim() ? message_de : message) || "";

  const copy = {
    closed: {
      title: t("closedTitle"),
      body: closesAt ? t("closedSince", { date: formatBerlin(closesAt, locale) }) : t("closedBody"),
    },
    full: { title: t("fullTitle"), body: t("fullBody") },
    upcoming: { title: t("upcomingTitle"), body: t("upcomingBody", { date: formatBerlin(opensAt, locale) }) },
  }[state];

  return (
    <div
      role="status"
      style={{
        background: "#fff",
        border: "1px solid rgba(19, 37, 58, 0.14)",
        borderRadius: "20px",
        padding: "40px 32px",
        textAlign: "center",
        boxShadow: "0 18px 40px -22px rgba(11, 42, 74, 0.35)",
      }}
    >
      <span
        aria-hidden="true"
        style={{ display: "inline-grid", placeItems: "center", width: 56, height: 56, borderRadius: "50%", background: "#13253a", color: "#fff", fontSize: 24, marginBottom: 14 }}
      >
        {state === "upcoming" ? "⏳" : "✓"}
      </span>
      <h3 style={{ margin: "0 0 8px", fontSize: "1.5rem", color: "#13253a", letterSpacing: "-0.03em" }}>{copy.title}</h3>
      <p style={{ margin: "0 auto", maxWidth: 480, color: "rgba(16, 37, 31, 0.72)", lineHeight: 1.6 }}>{copy.body}</p>
      {custom && <p style={{ margin: "12px auto 0", maxWidth: 480, color: "#13253a", lineHeight: 1.6, fontWeight: 600 }}>{custom}</p>}
      <p style={{ margin: "18px auto 0", maxWidth: 480, color: "rgba(16, 37, 31, 0.6)", fontSize: "0.9rem" }}>{t("closedFollow")}</p>
      <a
        href="https://www.instagram.com/afropeanbusinessnetwork/"
        target="_blank"
        rel="noreferrer"
        style={{ display: "inline-block", marginTop: 14, padding: "12px 22px", borderRadius: 999, background: "#E09000", color: "#13253a", fontWeight: 800, textDecoration: "none" }}
      >
        {t("closedCta")}
      </a>
    </div>
  );
}
