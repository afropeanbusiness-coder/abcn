"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import NavExtras from "@/components/NavExtras";
import SiteFooter from "@/components/SiteFooter";
import LogoMarquee from "@/components/LogoMarquee";
import "./about.css";
import Img from "@/components/Img";

const instagram = "https://www.instagram.com/afropeanbusinessnetwork/";

/**
 * Verified content from the supplied ABCN presentation PDF (page 4 FAQ and the
 * About Us statement). Nothing here is invented.
 *
 * Removed in the light rebuild:
 *  - A brand colour-palette swatch grid. That is an internal design artifact,
 *    not something a visitor to an About page needs.
 *  - A FIALI callout, a partner logo marquee and a closing CTA that all
 *    duplicated blocks already on the homepage.
 *  - An ecosystem gallery of stock imagery.
 * The page went from 11 sections and ~11 screens, all of them near-black, to
 * six light sections with a single deep-green slab for the founder.
 */
const mandateKeys = [
  { id: "mandate1", image: "/assets/abcn/events/salon-fireside-conversation.jpg" },
  { id: "mandate2", image: "/assets/abcn/events/business-conference-audience.jpg" },
  { id: "mandate3", image: "/assets/abcn/events/panel-discussion-hall.jpg" },
];

const faqKeys = ["faq1", "faq2", "faq3"];

function Arrow() {
  return (
    <svg className="arrow" viewBox="0 0 28 28" aria-hidden="true">
      <path d="M5 14h17" />
      <path d="m16 8 6 6-6 6" />
    </svg>
  );
}

export default function AboutPage() {
  const t = useTranslations("about");
  const tn = useTranslations("nav");
  const tf = useTranslations("home");
  return (
    <main className="about-page">
      <a className="skip-link" href="#top">{tn("skipToContent")}</a>

      <header className="nav nav-scrolled">
        <Link href="/" className="brand" aria-label={tn("home")}>
          <Img src="/assets/abcn/abcn-logo.png" alt="ABCN Logo" className="brand-logo-img" />
          <span className="brand-long">
            Afropean Business
            <br />& Culture Network
          </span>
        </Link>

        <nav className="nav-links">
          <Link href="/about">{tn("ourStory")}</Link>
          <Link href={{ pathname: "/", hash: "network" }}>{tn("whatWeDo")}</Link>
          <Link href="/events">{tn("events")}</Link>
          <Link href={{ pathname: "/", hash: "founder" }}>{tn("ourFounder")}</Link>
          <Link href={{ pathname: "/", hash: "join" }}>{tn("joinUs")}</Link>
        </nav>

        <div className="nav-right">
          <NavExtras />
          <a className="nav-cta" href={instagram} target="_blank" rel="noreferrer">
            <span>{tn("enterNetwork")}</span>
            <Arrow />
          </a>
        </div>
      </header>

      {/* Hero */}
      <section id="top" className="hero-light about-hero-light">
        <div className="hero-light-inner">
          <span className="pill">{t("pill")}</span>
          <h1>
            {t("titleLine1")}<br />
            <mark>{t("titleLine2")}</mark>
          </h1>
          <p className="hero-light-lead">
            {t("lead")}
          </p>
        </div>
      </section>

      {/* Mission statement, verbatim from the ABCN presentation */}
      <section className="section about-statement">
        <blockquote>
          {t("statement")}
        </blockquote>
        <div className="about-statement-mark">
          <Img src="/assets/abcn/abcn-emblem.png" alt="" aria-hidden="true" />
          <span>
            <strong>{t("foundingMandate")}</strong>
            <small>{t("place")}</small>
          </span>
        </div>
      </section>

      {/* What we stand for */}
      <section className="section what-we-do">
        <div className="sec-head">
          <span className="pill">{t("mandatesPill")}</span>
          <h2>{t("mandatesTitle")}</h2>
          <p>{t("mandatesLead")}</p>
        </div>

        <div className="wwd-grid wwd-grid-3">
          {mandateKeys.map((item) => (
            <article className="wwd-card" key={item.id}>
              <Img src={item.image} alt="" aria-hidden="true" className="wwd-img" />
              <div className="wwd-body">
                <span className="wwd-tag">{t(`${item.id}Tag`)}</span>
                <h3>{t(`${item.id}Title`)}</h3>
                <p>{t(`${item.id}Copy`)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="section about-faq">
        <div className="sec-head">
          <span className="pill">{t("faqPill")}</span>
          <h2>{t("faqTitle")}</h2>
        </div>
        <div className="about-faq-list">
          {faqKeys.map((key) => (
            <div className="about-faq-item" key={key}>
              <h3>{t(`${key}Q`)}</h3>
              <p>{t(`${key}A`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Founder - the single deep slab on this page */}
      <section id="founder" className="section founder">
        <div className="founder-visual">
          <div className="founder-portrait-frame">
            <Img
              src="/assets/abcn/harmonie-essome-official.jpg"
              alt={tf("founderPhotoAlt")}
              className="founder-photo"
            />
          </div>
        </div>

        <div className="founder-copy">
          <span className="section-label light">{tf("founderLabel")}</span>
          <h2>{tf("founderName")}<br /><em>{tf("founderSurname")}</em></h2>
          <p className="founder-lead">
            &ldquo;{tf("founderQuote")}&rdquo;
          </p>
          <p>
            {tf("founderBody")}
          </p>
        </div>
      </section>

      {/* Partner Ecosystem & Institutional Collaborators */}
      <section style={{ background: "#ffffff", padding: "40px 0 20px" }}>
        <LogoMarquee
          theme="light"
          speed="normal"
          label="Ecosystem & Institutional Partners"
          tagline="Frankfurt · Diaspora Network"
        />
      </section>

      {/* Close */}
      <section className="section about-close">
        <div className="about-close-inner">
          <h2>{t("closeTitle")}</h2>
          <p>
            {t("closeLead")}
          </p>
          <div className="hero-light-actions">
            <a href={instagram} target="_blank" rel="noreferrer" className="btn btn-primary">
              {tf("joinNetwork")} <i className="btn-dot"><Arrow /></i>
            </a>
            <Link href="/events" className="btn btn-ghost">
              {t("seeWhatsOn")} <i className="btn-dot"><Arrow /></i>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
