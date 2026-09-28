"use client";

import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { EventPartner } from "@/lib/events";
import LogoMarquee from "./LogoMarquee";

interface ProminentSupportersProps {
  partners?: EventPartner[];
  locale?: string;
  className?: string;
  showMarquee?: boolean;
}

export const MAJOR_FINANCIAL_SUPPORTERS: EventPartner[] = [
  {
    name: "Wirtschaftsförderung Frankfurt",
    logo: "/assets/fiali/logos/wirtschaftsfoerderung-frankfurt.png",
    website: "https://frankfurt-business.net",
    tier: "financial_supporter",
    tagline: "Wirtschaftsförderung der Stadt Frankfurt am Main",
  },
  {
    name: "Kompass Frankfurt",
    logo: "/assets/fiali/logos/kompass-frankfurt.png",
    website: "https://kompassfrankfurt.de",
    tier: "financial_supporter",
    tagline: "Zentrum für Existenzgründungen Frankfurt",
  },
  {
    name: "Frankfurt Forward",
    logo: "/assets/fiali/logos/frankfurt-forward.png",
    website: "https://frankfurt-forward.de",
    tier: "financial_supporter",
    tagline: "Startup-Matchmaking & Innovation Frankfurt",
  },
  {
    name: "DIWOC Rising",
    logo: "/assets/fiali/logos/divoc-rising.png",
    website: "https://diwoc-rising.com",
    tier: "financial_supporter",
    tagline: "Diversity in Women of Color Initiative",
  },
];

export const ECOSYSTEM_COMMUNITY_PARTNERS: EventPartner[] = [
  {
    name: "Black Women in Tech DACH",
    logo: "/assets/fiali/logos/black-women-in-tech-dach.png",
    website: "https://bwit-dach.org",
    tier: "ecosystem_partner",
  },
  {
    name: "Flourish & Prosper",
    logo: "/assets/fiali/logos/flourish-prosper.png",
    website: "https://flourishandprosper.org",
    tier: "ecosystem_partner",
  },
  {
    name: "ABCN (Afropean Business & Culture Network)",
    logo: "/assets/fiali/logos/abcn.png",
    website: "https://afropeanbusiness.com",
    tier: "ecosystem_partner",
  },
];

export default function ProminentSupporters({
  partners,
  locale = "en",
  className = "",
  showMarquee = true,
}: ProminentSupportersProps) {
  const te = useTranslations("events");

  // Determine major financial supporters: either from prop or defaults
  const majorSupporters = React.useMemo(() => {
    if (partners && partners.length >= 4) {
      const explicit = partners.filter((p) => p.tier === "financial_supporter");
      if (explicit.length >= 4) return explicit;
      // If not flagged with tier, take the first 4 partners as requested
      return partners.slice(0, 4);
    }
    return MAJOR_FINANCIAL_SUPPORTERS;
  }, [partners]);

  const ecosystemPartners = React.useMemo(() => {
    if (partners && partners.length > 4) {
      const remaining = partners.filter(
        (p) => !majorSupporters.some((m) => m.name.toLowerCase() === p.name.toLowerCase())
      );
      if (remaining.length > 0) return remaining;
    }
    return ECOSYSTEM_COMMUNITY_PARTNERS;
  }, [partners, majorSupporters]);

  const allPartnersCombined = React.useMemo(() => {
    return [...majorSupporters, ...ecosystemPartners];
  }, [majorSupporters, ecosystemPartners]);

  return (
    <div className={`prominent-supporters-wrapper ${className}`} style={{ width: "100%" }}>
      {/* Tier 1: Major Financial Supporters */}
      <div
        className="major-supporters-tier"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(246,248,250,0.96) 100%)",
          border: "1px solid rgba(19, 37, 58, 0.12)",
          borderRadius: "20px",
          padding: "36px 32px",
          boxShadow: "0 12px 36px -10px rgba(18, 36, 29, 0.08)",
          marginBottom: "32px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "720px", margin: "0 auto 28px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderRadius: "999px",
              background: "rgba(224, 144, 0, 0.12)",
              border: "1px solid rgba(224, 144, 0, 0.28)",
              color: "#a45e00",
              fontSize: "0.72rem",
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: "12px",
            }}
          >
            ★ {te("majorSupportersKicker")}
          </div>
          <h3
            style={{
              fontSize: "clamp(1.35rem, 2.8vw, 1.85rem)",
              fontWeight: 800,
              color: "#13253a",
              margin: "0 0 10px",
              lineHeight: 1.25,
              fontFamily: "var(--font-serif, Georgia, serif)",
            }}
          >
            {te("majorSupportersTitle1")} <em>{te("majorSupportersTitle2")}</em>
          </h3>
          <p
            style={{
              fontSize: "0.92rem",
              lineHeight: "1.6",
              color: "rgba(19, 37, 58, 0.72)",
              margin: 0,
            }}
          >
            {te("majorSupportersLead")}
          </p>
        </div>

        {/* 4 Major Financial Supporters Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
            alignItems: "stretch",
          }}
        >
          {majorSupporters.map((partner, index) => {
            const cardContent = (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#ffffff",
                  border: "1px solid rgba(19, 37, 58, 0.1)",
                  borderRadius: "14px",
                  padding: "24px 20px 18px",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
                  transition: "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
                  textAlign: "center",
                }}
                className="major-supporter-card"
              >
                {/* Badge */}
                <span
                  style={{
                    display: "inline-block",
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#0f766e",
                    background: "rgba(15, 118, 110, 0.08)",
                    border: "1px solid rgba(15, 118, 110, 0.2)",
                    borderRadius: "6px",
                    padding: "3px 8px",
                    marginBottom: "16px",
                  }}
                >
                  {te("majorFinancialSupporterBadge")}
                </span>

                {/* Logo with Original Authentic Colors */}
                <div
                  style={{
                    minHeight: "72px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    padding: "6px 0",
                  }}
                >
                  {partner.logo ? (
                    <img
                      src={partner.logo}
                      alt={partner.name}
                      style={{
                        maxHeight: "56px",
                        maxWidth: "180px",
                        width: "auto",
                        height: "auto",
                        objectFit: "contain",
                        display: "block",
                        filter: "none !important", // Preserve original brand colors
                      }}
                    />
                  ) : (
                    <strong style={{ fontSize: "1rem", color: "#13253a" }}>{partner.name}</strong>
                  )}
                </div>

                {/* Name & Tagline */}
                <div style={{ marginTop: "16px", width: "100%" }}>
                  <div
                    style={{
                      fontSize: "0.86rem",
                      fontWeight: 700,
                      color: "#13253a",
                      lineHeight: "1.3",
                    }}
                  >
                    {partner.name}
                  </div>
                  {partner.tagline && (
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "rgba(19, 37, 58, 0.58)",
                        marginTop: "4px",
                        lineHeight: "1.35",
                      }}
                    >
                      {partner.tagline}
                    </div>
                  )}
                </div>
              </div>
            );

            if (partner.website) {
              return (
                <a
                  key={partner.name + index}
                  href={partner.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}
                  title={`${partner.name} (${te("majorFinancialSupporterBadge")})`}
                >
                  {cardContent}
                </a>
              );
            }

            return (
              <div key={partner.name + index} style={{ height: "100%" }}>
                {cardContent}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tier 2: Strategic & Community Network */}
      {ecosystemPartners.length > 0 && (
        <div style={{ marginTop: "16px", marginBottom: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              padding: "0 8px 12px",
              borderBottom: "1px solid rgba(19, 37, 58, 0.08)",
            }}
          >
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "rgba(19, 37, 58, 0.65)",
              }}
            >
              {te("strategicPartnerBadge")}
            </span>
            <span
              style={{
                fontSize: "0.75rem",
                color: "rgba(19, 37, 58, 0.5)",
              }}
            >
              FIALI Frankfurt · Rhein-Main
            </span>
          </div>
        </div>
      )}

      {/* Infinite scrolling marquee of all partners */}
      {showMarquee && (
        <div className="partner-scroller-wrap" style={{ marginTop: "12px" }}>
          <LogoMarquee
            logos={allPartnersCombined}
            theme="light"
            speed="normal"
            label={te("partnersKicker")}
            tagline="Frankfurt 2026"
          />
        </div>
      )}
    </div>
  );
}
