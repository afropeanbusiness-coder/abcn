"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { EventPartner } from "@/lib/events";
import styles from "./LogoMarquee.module.css";

export const DEFAULT_FIALI_PARTNERS: EventPartner[] = [
  {
    name: "Wirtschaftsförderung Frankfurt",
    logo: "/assets/fiali/logos/wirtschaftsfoerderung-frankfurt.png",
    website: "https://frankfurt-business.net",
    tier: "financial_supporter",
  },
  {
    name: "Kompass Frankfurt",
    logo: "/assets/fiali/logos/kompass-frankfurt.png",
    website: "https://kompassfrankfurt.de",
    tier: "financial_supporter",
  },
  {
    name: "Frankfurt Forward",
    logo: "/assets/fiali/logos/frankfurt-forward.png",
    website: "https://frankfurt-forward.de",
    tier: "financial_supporter",
  },
  {
    name: "DIWOC Rising",
    logo: "/assets/fiali/logos/divoc-rising.png",
    website: "https://diwoc-rising.com",
    tier: "financial_supporter",
  },
  {
    name: "Black Women in Tech DACH",
    logo: "/assets/fiali/logos/black-women-in-tech-dach.png",
    website: "https://bwit-dach.org",
  },
  {
    name: "Flourish Where You Are Planted",
    logo: "/assets/fiali/logos/flourish-where-planted.png",
  },
  {
    name: "ABCN",
    logo: "/assets/fiali/logos/abcn.png",
    website: "https://afropeanbusiness.com",
  },
];

interface LogoMarqueeProps {
  logos?: EventPartner[];
  label?: string;
  tagline?: string;
  theme?: "light" | "dark";
  speed?: "normal" | "slow" | "fast";
  className?: string;
}

export default function LogoMarquee({
  logos,
  label = "Partner Ecosystem & Collaborators",
  tagline = "FIALI · Frankfurt 2026",
  theme = "light",
  speed = "normal",
  className = "",
}: LogoMarqueeProps) {
  // null = still loading, so deleted partners are never flashed from a default.
  const [fetchedLogos, setFetchedLogos] = useState<EventPartner[] | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/partners")
      .then((res) => res.json())
      .then((json) => {
        if (!live) return;
        if (json?.success && Array.isArray(json.data)) {
          setFetchedLogos(
            json.data.map((p: any) => ({
              name: p.name,
              logo: p.logo_url || p.logo || "",
              website: p.website_url || p.website || "",
            }))
          );
        } else {
          setFetchFailed(true);
        }
      })
      .catch(() => {
        if (live) setFetchFailed(true);
      });
    return () => {
      live = false;
    };
  }, []);

  const activeLogos = useMemo(() => {
    if (logos && logos.length > 0) return logos.filter((p) => p && p.name);
    if (fetchedLogos) return fetchedLogos.filter((p) => p && p.name);
    // Defaults only when the CMS could not be reached at all.
    return fetchFailed ? DEFAULT_FIALI_PARTNERS : [];
  }, [logos, fetchedLogos, fetchFailed]);

  // Duplicate items to ensure seamless continuous CSS infinite scroll
  const duplicatedLogos = useMemo(() => {
    // Return 4 sets of logos so the track is always longer than ultra-wide viewports
    return [...activeLogos, ...activeLogos, ...activeLogos, ...activeLogos];
  }, [activeLogos]);

  const wrapClasses = [
    styles.marqueeWrap,
    theme === "dark" ? styles.dark : styles.light,
    styles[speed],
    className,
  ].filter(Boolean).join(" ");

  if (activeLogos.length === 0) return null;

  return (
    <div className={wrapClasses} aria-label="Partner organizations logo ticker">
      {(label || tagline) && (
        <div className={styles.header}>
          {label && <span className={styles.headerLabel}>{label}</span>}
          {tagline && <span className={styles.headerTag}>{tagline}</span>}
        </div>
      )}

      <div className={styles.marqueeTrackWrap}>
        <div className={styles.marqueeTrack}>
          {duplicatedLogos.map((partner, index) => {
            const key = `${partner.name}-${index}`;
            const cardContent = partner.logo ? (
              <img
                src={partner.logo}
                alt={`${partner.name} logo`}
                className={styles.logoImage}
                loading="lazy"
              />
            ) : (
              <span className={styles.logoNameFallback}>{partner.name}</span>
            );

            if (partner.website) {
              return (
                <a
                  key={key}
                  href={partner.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.logoCard}
                  title={`Visit ${partner.name}`}
                >
                  {cardContent}
                </a>
              );
            }

            return (
              <div key={key} className={styles.logoCard} title={partner.name}>
                {cardContent}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
