export type EventStage = {
  stage: string;
  title: string;
  description: string;
  items: string[];
  image?: string;
  image_overlay?: string;
};

export type EventPartner = {
  name: string;
  logo?: string;
  website?: string;
  tier?: "financial_supporter" | "ecosystem_partner" | string;
  tagline?: string;
};

export type EventGrant = {
  count?: number;
  amount_each?: string;
  title?: string;
  description?: string;
};

export type EventContentCard = {
  title: string;
  description: string;
};

export type EventGalleryItem = {
  url: string;
  caption?: string;
  alt?: string;
  category?: string;
  /** Which chapter of the gallery the photo belongs to. */
  chapter?: "stage" | "rooms" | "together";
  size?: "standard" | "wide" | "tall";
};

export type EventRecord = {
  id?: string;
  slug: string;
  title: string;
  eyebrow?: string | null;
  short_description: string;
  description: string;
  long_description?: string | null;
  city?: string | null;
  country?: string | null;
  venue?: string | null;
  date_label?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  status: "draft" | "published" | "archived";
  event_type?: string | null;
  organizer?: string | null;
  hero_image_url?: string | null;
  card_image_url?: string | null;
  registration_url?: string | null;
  featured: boolean;
  priority: number;
  show_on_home: boolean;
  theme?: string | null;
  accent_color?: string | null;
  deep_color?: string | null;
  light_color?: string | null;
  highlights: string[];
  stages: EventStage[];
  eligibility: string[];
  partners: EventPartner[];
  grants: EventGrant;
  gallery: EventGalleryItem[];
  /** Custom application form; null/absent = the default form. See lib/application-form.ts */
  application_form?: unknown;
  application_open?: boolean;
  /** ISO instants; shown/edited in Frankfurt time. See lib/application-status.ts */
  application_opens_at?: string | null;
  application_closes_at?: string | null;
  application_max?: number | null;
  /** Manual decision by an admin: "open", "closed" or null (follow the schedule). */
  application_override?: string | null;
  application_closed_message?: string | null;
  application_closed_message_de?: string | null;
  application_deadline?: string | null;
  application_cta?: string | null;
  focus_areas: EventContentCard[];
  benefits: EventContentCard[];

  /**
   * German translations. Every field is optional: normaliseEvent falls back to
   * the English column per field, so a partially translated event still works.
   * Columns created by db/001_event_german_columns.sql.
   */
  title_de?: string | null;
  eyebrow_de?: string | null;
  short_description_de?: string | null;
  description_de?: string | null;
  long_description_de?: string | null;
  date_label_de?: string | null;
  venue_de?: string | null;
  application_cta_de?: string | null;
  application_deadline_de?: string | null;
  highlights_de?: string[] | null;
  eligibility_de?: string[] | null;
  stages_de?: EventStage[] | null;
  grants_de?: EventGrant | null;
  focus_areas_de?: EventContentCard[] | null;
  benefits_de?: EventContentCard[] | null;
};

/** Slug of the seeded flagship programme. */
export const FIALI_SLUG = "fiali-frankfurt-2026";

export const FIALI_FALLBACK: EventRecord = {
  slug: FIALI_SLUG,
  title: "Female Innovation Afropean Leadership Initiative",
  eyebrow: "FIALI · FRANKFURT 2026",
  short_description:
    "Empowering international female founders in Frankfurt through intensive business development, AI and digitalization, mentorship, matchmaking and ecosystem access.",
  description:
    "A two-event pilot programme bringing together 10-15 international female founders from Frankfurt am Main to strengthen business models and connect directly with the city's business and innovation ecosystem.",
  long_description:
    "FIALI is designed to highlight entrepreneurial potential, build stronger ventures through hands-on workshops and expert support, and create concrete connections to corporates, investors, business angels and strategic partners. The programme is led by Harmonie Essome and centres Afropean leadership, inclusive innovation and international female entrepreneurship.",
  city: "Frankfurt am Main",
  country: "Germany",
  venue: null,
  date_label: "Frankfurt · 2026 · Dates to be announced",
  start_at: null,
  end_at: null,
  status: "published",
  event_type: "Founder programme",
  organizer: "ABCN · led by Harmonie Essome",
  hero_image_url: "/assets/abcn/events/female-founders-lineup.jpg",
  card_image_url: "/assets/abcn/events/workshop-listening-session.jpg",
  registration_url: null,
  featured: true,
  priority: 100,
  show_on_home: true,
  theme: "fiali",
  accent_color: "#5F8FC0",
  deep_color: "#0B2A4A",
  light_color: "#F1F5FA",
  highlights: [
    "10-15 international female founders",
    "Two-stage pilot programme",
    "AI & digitalization",
    "90-day growth planning",
    "Founder pitches & matchmaking",
    "Corporate, investor & business angel access",
  ],
  stages: [
    {
      stage: "Stage 1",
      title: "Interactive Workshop & Strategy Lab",
      description:
        "A full-day intensive workshop supported by an external AI expert and startup specialist. Each participant builds an individual 90-day growth plan.",
      image: "/assets/abcn/events/sales-lab-workshop-room.jpg",
      image_overlay: "Interactive Workshop & Strategy Lab",
      items: [
        "Business Model Development",
        "Leadership & Positioning",
        "AI & Digitalization",
        "Go-to-Market Strategy",
        "Individual 90-Day Growth Plan",
      ],
    },
    {
      stage: "Stage 2",
      title: "Closing Summit, Pitch & Ecosystem Matchmaking",
      description:
        "An exclusive evening ecosystem summit connecting cohort founders directly with Frankfurt corporates, investors, business angels, and institutional innovators.",
      image: "/assets/abcn/events/business-development-talk.jpg",
      image_overlay: "Pitch Showcase & Ecosystem Matchmaking",
      items: [
        "Founder Pitches",
        "Business Matchmaking",
        "Expert Keynotes",
        "AI & Innovation Showcases",
      ],
    },
  ],
  eligibility: [
    "International female founders in Frankfurt and Rhine-Main",
    "African / Afropean diaspora background strongly welcome",
    "Innovative or scalable business model",
    "High interest in AI and digitalization",
    "Growth potential within Frankfurt",
  ],
  partners: [
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
      tagline: "Das Startup-Matchmaking-Projekt der Stadt Frankfurt",
    },
    {
      name: "DIWOC Rising",
      logo: "/assets/fiali/logos/divoc-rising.png",
      website: "https://diwoc-rising.com",
      tier: "financial_supporter",
      tagline: "Diversity in Women of Color Initiative",
    },
    {
      name: "Black Women in Tech DACH",
      logo: "/assets/fiali/logos/black-women-in-tech-dach.png",
      website: "https://bwit-dach.org",
      tier: "ecosystem_partner",
    },
    {
      name: "ABCN (Afropean Business & Culture Network)",
      logo: "/assets/fiali/logos/abcn.png",
      website: "https://afropeanbusiness.com",
      tier: "ecosystem_partner",
    },
  ],
  grants: {
    count: 1,
    amount_each: "€1,000",
    title: "Startup Innovation Grand Prize",
    description:
      "A grand prize of €1,000 awarded to 1 person supports early-stage founders developing digital or technical solutions, including prototyping, product development, branding, market entry, initial marketing and sales, and eligible incorporation expenses.",
  },
  gallery: [
    { url: "/assets/abcn/events/alumni-welcome-stage.jpg", caption: "Alumni Welcome & Partner Stage", category: "Community", chapter: "stage" },
    { url: "/assets/abcn/events/mentorship-conversation.jpg", caption: "Mentorship & Candid Dialogue", category: "Mentorship", chapter: "stage" },
    { url: "/assets/abcn/events/hall-keynote-audience.jpg", caption: "Keynote & Founder Spotlight", category: "Summit", chapter: "stage" },
    { url: "/assets/abcn/events/fireside-session-room.jpg", caption: "Fireside Session on Business Growth", category: "Fireside", chapter: "stage" },
    { url: "/assets/abcn/events/founder-conversation-spotlight.jpg", caption: "Founder Conversation Spotlight", category: "Interview", chapter: "rooms" },
    { url: "/assets/abcn/events/audience-listening-session.jpg", caption: "Full-House Community Session", category: "Community", chapter: "rooms" },
    { url: "/assets/abcn/events/workshop-participants-listening.jpg", caption: "Participants Listening In", category: "Workshops", chapter: "rooms" },
    { url: "/assets/abcn/events/cafe-networking-space.jpg", caption: "Informal Ecosystem Matchmaking", category: "Networking", chapter: "rooms" },
    { url: "/assets/abcn/events/friends-welcome-moment.jpg", caption: "Founders Meeting Founders", category: "Networking", chapter: "together" },
    { url: "/assets/abcn/events/evening-social-gathering.jpg", caption: "Evening Network Gathering", category: "Community", chapter: "together" },
    { url: "/assets/abcn/events/style-networking-evening.jpg", caption: "Style & Networking Evening", category: "Networking", chapter: "together" },
    { url: "/assets/abcn/events/frankfurt-skyline-street.jpg", caption: "The City We Build In", category: "Frankfurt", chapter: "together" },
  ],
  application_open: true,
  application_deadline: "Applications reviewed on a rolling basis · limited cohort of 10-15 founders",
  application_cta: "Apply for FIALI",
  focus_areas: [
    { title: "Business Model Development", description: "Sharpen the model, value proposition and commercial logic behind the venture." },
    { title: "Leadership & Positioning", description: "Strengthen founder positioning, leadership presence and strategic narrative." },
    { title: "AI & Digitalization", description: "Turn AI and digital tools into practical leverage for execution and growth." },
    { title: "Go-to-Market Strategy", description: "Build a clearer route to customers, partnerships and market traction." },
  ],
  benefits: [
    { title: "A 90-day growth plan", description: "Leave the Growth Lab with a practical individual roadmap for the next stage of your business." },
    { title: "Expert founder support", description: "Work through business, positioning, digitalization and growth questions with specialist input." },
    { title: "Frankfurt ecosystem access", description: "Build direct connections with corporates, investors, business angels and strategic partners." },
    { title: "Founder visibility", description: "Pitch, present and position your venture in front of people who can open relevant doors." },
    { title: "AI that is useful now", description: "Explore concrete ways to apply AI and digital tools to your operating model and growth." },
    { title: "Grand Prize opportunity", description: "Eligible early-stage founders can compete for the €1,000 Startup Innovation Grand Prize awarded to 1 person." },
  ],
};


/**
 * German copy for the seeded FIALI programme.
 *
 * Used when the CMS row carries no *_de value for a field, so /de shows German
 * programme content rather than English. A German value in the database always
 * wins over this.
 */
export const FIALI_FALLBACK_DE: Partial<EventRecord> = {
  title: "Innovations- und Führungsinitiative für afropäische Frauen",
  eyebrow: "FIALI · FRANKFURT 2026",
  short_description:
    "Stärkung internationaler Gründerinnen in Frankfurt durch intensive Geschäftsentwicklung, KI und Digitalisierung, Mentoring, Matchmaking und Zugang zum Ökosystem.",
  description:
    "Ein zweiteiliges Pilotprogramm, das 10-15 internationale Gründerinnen aus Frankfurt am Main zusammenbringt, um Geschäftsmodelle zu stärken und direkte Verbindungen in das Wirtschafts- und Innovationsökosystem der Stadt zu schaffen.",
  long_description:
    "FIALI macht unternehmerisches Potenzial sichtbar, stärkt Unternehmen durch praxisnahe Workshops und Expertenbegleitung und schafft konkrete Verbindungen zu Unternehmen, Investorinnen und Investoren, Business Angels und strategischen Partnern. Das Programm wird von Harmonie Essome geleitet und stellt afropäische Führung, inklusive Innovation und internationales Unternehmerinnentum in den Mittelpunkt.",
  date_label: "Frankfurt · 2026 · Termine werden bekannt gegeben",
  application_cta: "Für FIALI bewerben",
  application_deadline:
    "Bewerbungen werden laufend geprüft · begrenzter Jahrgang von 10-15 Gründerinnen",
  highlights: [
    "10-15 internationale Gründerinnen",
    "Zweistufiges Pilotprogramm",
    "KI & Digitalisierung",
    "90-Tage-Wachstumsplanung",
    "Pitches & Matchmaking",
    "Zugang zu Unternehmen, Investoren und Business Angels",
  ],
  stages: [
    {
      stage: "Phase 1",
      title: "Female Innovation Growth Lab",
      description:
        "Ein ganztägiger Intensiv-Workshop, begleitet von einer externen KI-Expertin und einem Startup-Spezialisten. Jede Teilnehmerin entwickelt einen individuellen 90-Tage-Wachstumsplan.",
      items: [
        "Geschäftsmodell-Entwicklung",
        "Führung & Positionierung",
        "KI & Digitalisierung",
        "Go-to-Market-Strategie",
        "Individueller 90-Tage-Wachstumsplan",
      ],
    },
    {
      stage: "Phase 2",
      title: "Female Founder Business Networking Summit",
      description:
        "Ein exklusiver Abend, der die Gründerinnen des Jahrgangs direkt mit Frankfurter Unternehmen, Investorinnen und Investoren, Business Angels und institutionellen Innovatoren zusammenbringt.",
      items: [
        "Pitches der Gründerinnen",
        "Business-Matchmaking",
        "Impulsvorträge von Expertinnen und Experten",
        "KI- & Innovations-Showcases",
      ],
    },
  ],
  eligibility: [
    "Internationale Gründerinnen in Frankfurt und Rhein-Main",
    "Afrikanischer / afropäischer Diaspora-Hintergrund ausdrücklich willkommen",
    "Innovatives oder skalierbares Geschäftsmodell",
    "Großes Interesse an KI und Digitalisierung",
    "Wachstumspotenzial in Frankfurt",
  ],
  grants: {
    count: 1,
    amount_each: "1.000 €",
    title: "Startup-Innovationshauptpreis",
    description:
      "Ein Hauptpreis von 1.000 € für 1 Person unterstützt Gründerinnen in der Frühphase bei digitalen oder technischen Lösungen – etwa Prototyping, Produktentwicklung, Branding, Markteintritt, erstes Marketing und Vertrieb sowie förderfähige Gründungskosten.",
  },
  focus_areas: [
    { title: "Geschäftsmodell-Entwicklung", description: "Modell, Nutzenversprechen und die kommerzielle Logik des Unternehmens schärfen." },
    { title: "Führung & Positionierung", description: "Positionierung als Gründerin, Führungspräsenz und strategische Erzählung stärken." },
    { title: "KI & Digitalisierung", description: "KI und digitale Werkzeuge in praktischen Hebel für Umsetzung und Wachstum verwandeln." },
    { title: "Go-to-Market-Strategie", description: "Einen klareren Weg zu Kundinnen, Partnerschaften und Marktzugang entwickeln." },
  ],
  benefits: [
    { title: "Ein 90-Tage-Wachstumsplan", description: "Verlassen Sie das Growth Lab mit einem konkreten individuellen Fahrplan für die nächste Phase." },
    { title: "Fachliche Begleitung", description: "Fragen zu Geschäft, Positionierung, Digitalisierung und Wachstum mit Fachleuten durcharbeiten." },
    { title: "Zugang zum Frankfurter Ökosystem", description: "Direkte Verbindungen zu Unternehmen, Investoren, Business Angels und strategischen Partnern aufbauen." },
    { title: "Sichtbarkeit als Gründerin", description: "Ihr Unternehmen vor Menschen präsentieren, die relevante Türen öffnen können." },
    { title: "KI, die jetzt nützt", description: "Konkrete Wege finden, KI und digitale Werkzeuge auf Ihr Geschäftsmodell anzuwenden." },
    { title: "Chance auf den Hauptpreis", description: "Förderfähige Gründerinnen können um den Startup-Innovationshauptpreis in Höhe von 1.000 € für 1 Person pitchen." },
  ],
};

/** The seeded FIALI event in the requested language. */
export function fallbackEvent(locale: string = "en"): EventRecord {
  return locale === "de"
    ? { ...FIALI_FALLBACK, ...FIALI_FALLBACK_DE }
    : FIALI_FALLBACK;
}

/**
 * Event imagery must be curated. A CMS row was carrying a generic remote stock
 * URL as FIALI's hero image - it rendered a photograph of a man at the top of a
 * programme for female founders. Remote stock URLs are therefore rejected and
 * the curated local asset is used instead.
 *
 * Locally-hosted paths (/assets/...) always win, so the CMS keeps full control
 * as soon as a proper image is uploaded to the project.
 */
const REMOTE_STOCK = /^https?:\/\/(images\.unsplash\.com|source\.unsplash\.com|images\.pexels\.com)/i;

function curatedImage(
  value: string | null | undefined,
  fallback: string | null | undefined
): string | null {
  if (!value) return fallback ?? null;
  if (REMOTE_STOCK.test(value)) return fallback ?? null;
  return value;
}

/**
 * Picks the German variant of a field when one exists, else the English one.
 * Every *_de column is nullable, so an untranslated event simply shows English
 * rather than a gap. See db/001_event_german_columns.sql.
 */
function pick<T>(
  row: Record<string, unknown>,
  key: string,
  locale: string,
  fallback: T,
  preferFallback = false
): T {
  if (locale === "de") {
    const de = row[`${key}_de`];
    if (de !== null && de !== undefined && de !== "" && !(Array.isArray(de) && de.length === 0)) return de as T;
    // No German in the CMS. For the seeded FIALI programme we hold curated
    // German copy, which reads better than falling through to English.
    if (preferFallback) return fallback;
  }
  const en = row[key];
  if (en === null || en === undefined || en === "") return fallback;
  if (preferFallback && Array.isArray(en) && en.length === 0) return fallback;
  return en as T;
}

export function normaliseEvent(
  row: Partial<EventRecord>,
  locale: string = "en"
): EventRecord {
  const r = row as Record<string, unknown>;
  // German seed copy backs the English seed, so an untranslated CMS row still
  // renders German programme content on /de.
  const base: EventRecord =
    locale === "de" ? { ...FIALI_FALLBACK, ...FIALI_FALLBACK_DE } : FIALI_FALLBACK;
  // Only the seeded FIALI event has curated German copy to prefer.
  const seeded = (row.slug || FIALI_FALLBACK.slug) === FIALI_FALLBACK.slug;
  return {
    ...base,
    ...row,
    hero_image_url: curatedImage(row.hero_image_url, FIALI_FALLBACK.hero_image_url),
    card_image_url: curatedImage(row.card_image_url, FIALI_FALLBACK.card_image_url),
    slug: row.slug || FIALI_FALLBACK.slug,
    title: pick(r, "title", locale, base.title, seeded),
    eyebrow: pick(r, "eyebrow", locale, base.eyebrow, seeded),
    short_description: pick(r, "short_description", locale, base.short_description, seeded),
    description: pick(r, "description", locale, base.description, seeded),
    long_description: pick(r, "long_description", locale, base.long_description, seeded),
    date_label: pick(r, "date_label", locale, base.date_label, seeded),
    venue: pick(r, "venue", locale, base.venue, seeded),
    status: row.status || "draft",
    featured: Boolean(row.featured),
    priority: Number(row.priority || 0),
    show_on_home: Boolean(row.show_on_home),
    highlights: pick(r, "highlights", locale, base.highlights || [], seeded),
    stages: pick(r, "stages", locale, base.stages || [], seeded),
    eligibility: pick(r, "eligibility", locale, base.eligibility || [], seeded),
    partners: (() => {
      // An array from the CMS is authoritative even when empty or partly
      // deleted. The seeded programme is used only when the row has no
      // partners value at all, never to refill a list an editor emptied.
      const raw = Array.isArray(row.partners)
        ? row.partners
        : seeded
        ? FIALI_FALLBACK.partners
        : [];
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((p: any) => p && p.name)
        .map((p: any) => ({
          name: p.name || "",
          logo: p.logo || p.logo_url || "",
          website: p.website || p.website_url || "",
          tier: p.tier || undefined,
          tagline: p.tagline || undefined,
        }));
    })(),
    grants: pick(r, "grants", locale, base.grants, seeded),
    gallery: (() => {
      const raw =
        Array.isArray(row.gallery) && row.gallery.length > 0
          ? row.gallery
          : seeded
          ? FIALI_FALLBACK.gallery
          : [];
      if (!Array.isArray(raw)) return [];
      return raw
        .map((item: any) => {
          if (typeof item === "string") {
            return {
              url: item,
              caption: "",
              alt: "",
              category: "Atmosphere",
              size: "standard" as const,
            };
          }
          return {
            url: item.url || "",
            caption: item.caption || "",
            alt: item.alt || item.caption || "",
            category: item.category || "Atmosphere",
            chapter: ["stage", "rooms", "together"].includes(item.chapter) ? item.chapter : undefined,
            size: (item.size || "standard") as "standard" | "wide" | "tall",
          };
        })
        .filter((item) => item.url && !REMOTE_STOCK.test(item.url));
    })(),
    application_form: row.application_form ?? null,
    application_open: Boolean(row.application_open),
    application_opens_at: row.application_opens_at ?? null,
    application_closes_at: row.application_closes_at ?? null,
    application_max: row.application_max ?? null,
    application_override: row.application_override ?? null,
    application_closed_message: row.application_closed_message ?? null,
    application_closed_message_de: row.application_closed_message_de ?? null,
    application_deadline: pick(r, "application_deadline", locale, base.application_deadline, seeded),
    application_cta: pick(r, "application_cta", locale, base.application_cta || (locale === "de" ? "Jetzt bewerben" : "Apply now"), seeded),
    focus_areas: pick(r, "focus_areas", locale, base.focus_areas || [], seeded),
    benefits: pick(r, "benefits", locale, base.benefits || [], seeded),
  };
}
