"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import FeaturedEventSpotlight from "@/components/FeaturedEventSpotlight";
import NavExtras from "@/components/NavExtras";
import SiteFooter from "@/components/SiteFooter";
import Voices from "@/components/Voices";
import SlideshowGallery from "@/components/SlideshowGallery";
import HighlightVideo from "@/components/HighlightVideo";
import { FIALI_SLUG } from "@/lib/events";
import Img from "@/components/Img";

const instagram = "https://www.instagram.com/afropeanbusinessnetwork/";
const founderInstagram = "https://www.instagram.com/harmonieessome/";

// Format keys; the copy lives in messages/{en,de}.json.
const formatKeys = [
  { id: "format1", image: "/assets/abcn/events/community-circle-conversation.jpg" },
  { id: "format2", image: "/assets/abcn/events/salon-conversation-circle.jpg" },
  { id: "format3", image: "/assets/abcn/events/conference-audience-hall.jpg" },
  { id: "format4", image: null },
];

// Three equal columns inside a centred measure; two columns below 760px.
const HERO_STRIP_SIZES = "(max-width: 760px) 50vw, 380px";

const images = {
  hero: "/assets/abcn/events/rooftop-community-gathering.jpg",
  business: "/assets/abcn/events/afropean-team-outdoors.jpg",
  culture: "/assets/abcn/events/afropean-women-celebration.jpg",
  join: "/assets/abcn/events/community-team-portrait.jpg",
};

function Arrow({ down = false }: { down?: boolean }) {
  return (
    <svg className={down ? "arrow down" : "arrow"} viewBox="0 0 28 28" aria-hidden="true">
      <path d="M5 14h17" />
      <path d="m16 8 6 6-6 6" />
    </svg>
  );
}

export default function Home() {
  const t = useTranslations("home");
  const tn = useTranslations("nav");
  const [menu, setMenu] = useState(false);
  const [scroll, setScroll] = useState(0);

  useEffect(() => {
    const update = () => setScroll(window.scrollY);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const progress =
    typeof window === "undefined"
      ? 0
      : Math.min(
          100,
          (scroll /
            Math.max(1, document.documentElement.scrollHeight - window.innerHeight)) *
            100
        );

  return (
    <main>
      <a className="skip-link" href="#top">{tn("skipToContent")}</a>
      <div className="progress" style={{ width: progress + "%" }} />

      <header className={"nav " + (scroll > 24 ? "nav-scrolled" : "")}>
        <a href="#top" className="brand" aria-label={tn("home")}>
          <Img
            src="/assets/abcn/abcn-logo.png"
            alt="ABCN Logo"
            className="brand-logo-img"
            sizes="110px"
            priority
          />
          <span className="brand-long">
            Afropean Business
            <br />& Culture Network
          </span>
        </a>

        <nav className={"nav-links " + (menu ? "open" : "")}>
          <a href="#about" onClick={() => setMenu(false)}>{tn("ourStory")}</a>
          <a href="#network" onClick={() => setMenu(false)}>{tn("whatWeDo")}</a>
          <Link href="/events" onClick={() => setMenu(false)}>{tn("events")}</Link>
          <a href="#founder" onClick={() => setMenu(false)}>{tn("ourFounder")}</a>
          <a href="#join" onClick={() => setMenu(false)}>{tn("joinUs")}</a>
          <a
            className="nav-cta-mobile"
            href={instagram}
            target="_blank"
            rel="noreferrer"
            onClick={() => setMenu(false)}
          >
            {tn("enterNetwork")}
          </a>
        </nav>

        {/* Right Nav Cluster: Social Share, Language Switcher & CTA */}
        <div className="nav-right">
          <NavExtras />

          <a className="nav-cta" href={instagram} target="_blank" rel="noreferrer">
            <span>{tn("enterNetwork")}</span>
            <Arrow />
          </a>

          <button
            className={"menu " + (menu ? "active" : "")}
            aria-label={tn("toggleNav")}
            onClick={() => setMenu((value) => !value)}
          >
            <span />
            <span />
          </button>
        </div>
      </header>

      {/* Light, centred hero. The previous dark cinematic version - WebGL
          particle field, gradient-shimmer headline, glow orbs, film grain -
          read as an AI product landing page. All three reference sites are
          light, centred, and lead with real photographs of people. */}
      <section id="top" className="hero-light">
        <div className="hero-light-inner">
          <span className="pill">{t("heroPill")}</span>

          <h1>
            {t("heroTitleLine1")}<br />
            <mark>{t("heroTitleLine2")}</mark>
          </h1>

          <p className="hero-light-lead">
            {t("heroLead")}
          </p>

          <div className="hero-light-actions">
            <a href={instagram} target="_blank" rel="noreferrer" className="btn btn-primary">
              {t("joinNetwork")} <i className="btn-dot"><Arrow /></i>
            </a>
            <a href="#featured-event" className="btn btn-ghost">
              {t("seeFiali")} <i className="btn-dot"><Arrow /></i>
            </a>
          </div>
        </div>

        <div className="hero-strip">
          <figure>
            <Img src={images.hero} alt={t("heroAlt1")} sizes={HERO_STRIP_SIZES} priority />
          </figure>
          <figure>
            <Img src={images.culture} alt={t("heroAlt2")} sizes={HERO_STRIP_SIZES} />
          </figure>
          <figure>
            <Img src={images.business} alt={t("heroAlt3")} sizes={HERO_STRIP_SIZES} />
          </figure>
        </div>
      </section>

      {/* Priority Event Spotlight with Transparent Scrolling Logo Marquee */}
      <FeaturedEventSpotlight />



      <section id="about" className="about-restructured">
        <div className="about-kicker-row">
          <div className="about-kicker-badge">
            <span>{t("aboutPill")}</span>
          </div>
          
        </div>

        <div className="about-split-head">
          <h2>
            {t("aboutTitle")}
          </h2>
          <p>
            {t("aboutLead")}
          </p>
        </div>

        <div className="about-showcase-grid">
          {/* Left: Mission Statement & Emblem Showcase */}
          <div className="about-quote-card">
            <div className="about-quote-top">
              <Img
                src="/assets/abcn/abcn-emblem.png"
                alt="ABCN Official Emblem"
                className="about-emblem-micro"
                sizes="48px"
              />
              <span className="about-origin-tag">{t("origin")}</span>
            </div>

            <p className="about-statement-text">
              &ldquo;{t("statement")}&rdquo;
            </p>

            <div className="about-quote-foot">
              <span>{t("foundingMandate")}</span>
              <strong style={{ color: "var(--brand-forest, #0b2a4a)" }}>Inclusive Diaspora Platform 🌍</strong>
            </div>
          </div>

          {/* "Who is ABCN for?" - the question the homepage never answered.
              The three impact pillars that used to sit here are already on /about
              as the mandates section, in near-identical wording. */}
          <div className="about-pillars-stack">
            <span className="about-audience-label">{t("audienceLabel")}</span>

            <div className="about-pillar-card">
              <span className="about-pillar-index">01</span>
              <div className="about-pillar-content">
                <h3>{t("audience1Title")}</h3>
                <p>
                  {t("audience1Copy")}
                </p>
              </div>
            </div>

            <div className="about-pillar-card">
              <span className="about-pillar-index">02</span>
              <div className="about-pillar-content">
                <h3>{t("audience2Title")}</h3>
                <p>
                  {t("audience2Copy")}
                </p>
              </div>
            </div>

            <div className="about-pillar-card">
              <span className="about-pillar-index">03</span>
              <div className="about-pillar-content">
                <h3>{t("audience3Title")}</h3>
                <p>
                  {t("audience3Copy")}
                </p>
              </div>
            </div>

            <p className="about-audience-note">
              {t("audienceNote")}
            </p>
          </div>
        </div>

        {/* One plain link out. The stat row here repeated "7.6K+" from the
            Join section and sat under a second CTA to the same page. */}
        <Link className="about-more" href="/about">
          {t("readFullStory")} <Arrow />
        </Link>
      </section>

      {/* Three plain cards, the pattern every reference site uses. This replaces
          a dark tabbed "lenses" widget and a separate 3-panel photo strip that
          explained the same three things - business, culture, community. */}
      <section id="network" className="section what-we-do">
        <div className="sec-head">
          <span className="pill">{t("whatWeDoPill")}</span>
          <h2>{t("whatWeDoTitle")}</h2>
          <p>{t("whatWeDoLead")}</p>
        </div>

        <div className="wwd-grid">
          {formatKeys.map((item) => (
            <article
              className={"wwd-card" + (item.image ? "" : " wwd-card-accent")}
              key={item.id}
            >
              {item.image && (
                <Img
                  src={item.image}
                  alt=""
                  aria-hidden="true"
                  className="wwd-img"
                  sizes="(max-width: 760px) 100vw, (max-width: 1200px) 50vw, 380px"
                />
              )}
              <div className="wwd-body">
                <span className="wwd-tag">{t(`${item.id}Tag`)}</span>
                <h3>{t(`${item.id}Title`)}</h3>
                <p>{t(`${item.id}Copy`)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Strategic Live Impressions Slideshow Gallery */}
      <SlideshowGallery />

      {/* Highlights video */}
      <HighlightVideo />

      <section id="founder" className="section founder">
        <div className="founder-visual">
          <div className="founder-portrait-frame">
            <Img
              src="/assets/abcn/events/harmonie-essome-speaking.jpg"
              alt={t("founderPhotoAlt")}
              className="founder-photo"
              sizes="(max-width: 900px) 100vw, 520px"
            />
          </div>
        </div>

        <div className="founder-copy">
          <span className="section-label light">{t("founderLabel")}</span>
          <h2>{t("founderName")}<br /><em>{t("founderSurname")}</em></h2>
          <p className="founder-lead">
            &ldquo;{t("founderQuote")}&rdquo;
          </p>
          <p>
            {t("founderBody")}
          </p>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "12px" }}>
            <Link className="founder-link" href="/about">
              {t("founderLink")} <Arrow />
            </Link>
          </div>
        </div>
      </section>



      {/* Renders only once real, attributable member quotes exist. */}
      <Voices />

      {/* The "Manifesto" section was removed. A creed section is an agency
          template trope, its three pillars restated the network lenses, and it
          added a fourth dark slab to an already busy page. */}

      {/* Join / Conversion Section */}
      <section id="join" className="join">
        <div className="join-glow" />

        <div className="join-copy">
          <span className="join-kicker">{t("joinKicker")}</span>
          <h2>
            {t("joinTitle")}
          </h2>
          <p className="join-lead">
            {t("joinLead")}
          </p>

          <div className="join-actions-cluster">
            {/* Inclusive action leads: most visitors are not eligible for FIALI,
                so sending them to a women-only application is a dead end. */}
            <a
              href={instagram}
              target="_blank"
              rel="noreferrer"
              className="join-btn-primary"
            >
              {t("joinCommunity")} ↗
            </a>
            <Link
              href={{ pathname: "/events/[slug]", params: { slug: FIALI_SLUG } }}
              className="join-btn-glass"
            >
              {t("applyFiali")} →
            </Link>
          </div>

          {/* Metrics row removed: it repeated 7.6K+ and 10-15 from elsewhere
              on the page. The FIALI facts strip is the one place numbers live. */}
        </div>

        {/* Brand surface: uses an ABCN asset, not a FIALI programme asset.
            See CONTENT-SOURCES.md - this still needs mixed-gender ABCN-owned
            photography to stop the inclusive homepage reading as women-only. */}
        <div className="join-visual-frame">
          <Img
            src={images.join}
            alt={t("joinVisualAlt")}
            className="join-visual-img"
            sizes="(max-width: 900px) 100vw, 620px"
          />
          <div className="join-visual-overlay">
            <span className="join-floating-badge">{t("joinBadge")}</span>
            <span className="join-overlay-tag">{t("joinOverlayTag")}</span>
            <h3 className="join-overlay-title">{t("joinOverlayTitle")}</h3>
            <p className="join-overlay-desc">
              {t("joinOverlayCopy")}
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
