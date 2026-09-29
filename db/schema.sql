-- =============================================================================
-- ABCN Database Schema & Initial Data
-- Run this in your new Neon Database SQL Editor
-- =============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Table: events
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  eyebrow TEXT,
  short_description TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  long_description TEXT,
  city TEXT,
  country TEXT,
  venue TEXT,
  date_label TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft',
  event_type TEXT,
  organizer TEXT DEFAULT 'ABCN',
  hero_image_url TEXT,
  card_image_url TEXT,
  registration_url TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 0,
  show_on_home BOOLEAN NOT NULL DEFAULT false,
  theme TEXT,
  accent_color TEXT DEFAULT '#5F8FC0',
  deep_color TEXT DEFAULT '#0B2A4A',
  light_color TEXT DEFAULT '#F1F5FA',
  highlights JSONB DEFAULT '[]'::jsonb,
  stages JSONB DEFAULT '[]'::jsonb,
  eligibility JSONB DEFAULT '[]'::jsonb,
  partners JSONB DEFAULT '[]'::jsonb,
  grants JSONB DEFAULT '{}'::jsonb,
  gallery JSONB DEFAULT '[]'::jsonb,
  application_open BOOLEAN DEFAULT false,
  application_deadline TEXT,
  application_cta TEXT DEFAULT 'Apply now',
  focus_areas JSONB DEFAULT '[]'::jsonb,
  benefits JSONB DEFAULT '[]'::jsonb,

  -- German Localization Columns
  title_de TEXT,
  eyebrow_de TEXT,
  short_description_de TEXT,
  description_de TEXT,
  long_description_de TEXT,
  date_label_de TEXT,
  venue_de TEXT,
  application_cta_de TEXT,
  application_deadline_de TEXT,
  highlights_de JSONB,
  stages_de JSONB,
  eligibility_de JSONB,
  grants_de JSONB,
  focus_areas_de JSONB,
  benefits_de JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. Table: event_applications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role_title TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  country TEXT,
  company_name TEXT,
  company_website TEXT,
  business_model TEXT,
  venture_stage TEXT,
  ai_interest TEXT,
  motivation TEXT,
  goals TEXT,
  referral_source TEXT,
  consent BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'submitted',
  admin_notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_priority ON events(priority DESC);
CREATE INDEX IF NOT EXISTS idx_applications_event ON event_applications(event_id);
CREATE INDEX IF NOT EXISTS idx_applications_submitted ON event_applications(submitted_at DESC);

-- -----------------------------------------------------------------------------
-- 4. Seed Default Flagship Programme (FIALI Frankfurt 2026)
-- -----------------------------------------------------------------------------
INSERT INTO events (
  slug,
  title,
  eyebrow,
  short_description,
  description,
  long_description,
  city,
  country,
  venue,
  date_label,
  status,
  event_type,
  organizer,
  hero_image_url,
  card_image_url,
  featured,
  priority,
  show_on_home,
  accent_color,
  deep_color,
  light_color,
  application_open,
  application_deadline,
  application_cta,
  highlights,
  stages,
  eligibility,
  partners,
  grants,
  focus_areas,
  benefits,
  title_de,
  eyebrow_de,
  short_description_de,
  description_de,
  long_description_de,
  date_label_de,
  venue_de,
  application_cta_de,
  application_deadline_de
)
VALUES (
  'fiali-frankfurt-2026',
  'Female Innovation Afropean Leadership Initiative',
  'FIALI · FRANKFURT 2026',
  'Empowering international female founders in Frankfurt through intensive business development, AI and digitalization, mentorship, matchmaking and ecosystem access.',
  'A two-event pilot programme bringing together 10-15 international female founders from Frankfurt am Main to strengthen business models and connect directly with the city''s business and innovation ecosystem.',
  'FIALI is designed to highlight entrepreneurial potential, build stronger ventures through hands-on workshops and expert support, and create concrete connections to corporates, investors, business angels and strategic partners. The programme is led by Harmonie Essome and centres Afropean leadership, inclusive innovation and international female entrepreneurship.',
  'Frankfurt am Main',
  'Germany',
  'Frankfurt am Main, Germany',
  'April – May 2026',
  'published',
  'Flagship Programme',
  'ABCN · Afropean Business & Culture Network',
  '/assets/fiali/growth-lab-session.jpg',
  '/assets/fiali/female-founders-summit.jpg',
  true,
  100,
  true,
  '#5F8FC0',
  '#0B2A4A',
  '#F1F5FA',
  true,
  'April 15, 2026',
  'Apply for FIALI 2026',
  '[
    "Two high-impact events: Growth Lab Workshop and Pitch & Ecosystem Summit",
    "10–15 international female founders selected for dedicated support",
    "€1,000 equity-free grants for up to 3 outstanding participants",
    "Practical training in AI, digital strategy, branding and scalability",
    "Curated matchmaking with Frankfurt corporates, angel investors and mentors"
  ]'::jsonb,
  '[
    {
      "stage": "Stage 01",
      "title": "Interactive Workshop & Strategy Lab",
      "description": "A full-day intensive session focused on business model refinement, AI and digital adoption, market positioning, and financial planning.",
      "image": "/assets/abcn/real/interactive-workshop-session.jpg",
      "image_overlay": "Interactive Workshop & Strategy Lab",
      "items": [
        "Business Model & Scalability refinement",
        "AI and Digital Transformation for modern operations",
        "Strategic Marketing, Branding & Value Proposition",
        "Pitch and Narrative Training for investors and partners",
        "Financial Planning & Investment Readiness"
      ]
    },
    {
      "stage": "Stage 02",
      "title": "Closing Summit, Pitch & Ecosystem Matchmaking",
      "description": "High-visibility closing event celebrating female entrepreneurship, featuring participant pitches, curated networking, and micro-grant announcements.",
      "image": "/assets/abcn/real/startup-pitch-showcase.jpg",
      "image_overlay": "Pitch Showcase & Ecosystem Matchmaking",
      "items": [
        "Welcome addresses and opening keynote",
        "Founder Pitch Session to jury, investors, and ecosystem partners",
        "Panel: Inclusive Innovation & Supporting Diverse Founders in Frankfurt",
        "Announcement & award of the €1,000 Grand Prize to 1 founder",
        "Curated Networking with corporates, angels, and ecosystem leaders"
      ]
    }
  ]'::jsonb,
  '[
    "International female founders based in or connected to Frankfurt am Main",
    "Early-stage to growth-stage businesses across tech, creative, commerce or services",
    "Commitment to participate in both workshop and summit stages",
    "Ambition to scale, adopt digital/AI tools, and engage with the Frankfurt business ecosystem"
  ]'::jsonb,
  '[
    { "name": "City of Frankfurt", "website": "https://frankfurt.de" },
    { "name": "Wirtschaftsförderung Frankfurt", "website": "https://frankfurt-business.net" },
    { "name": "Station Frankfurt", "website": "https://station-frankfurt.de" }
  ]'::jsonb,
  '{
    "count": 3,
    "amount_each": "€1,000",
    "title": "Equity-Free Founder Micro-Grants",
    "description": "Up to three outstanding founders participating in FIALI will be awarded a €1,000 equity-free grant to support product development, digital tools, or growth initiatives."
  }'::jsonb,
  '[
    { "title": "AI & Digitalization", "description": "Leveraging generative AI, automation, and modern digital infrastructure to scale operations with lean teams." },
    { "title": "Strategic Branding", "description": "Clarifying narrative, market position, and international reach to stand out to enterprise clients and consumers." },
    { "title": "Capital & Ecosystem", "description": "Direct access to Frankfurt angels, institutional networks, and public funding programmes." },
    { "title": "Peer Community", "description": "A close-knit cohort of ambitious Afropean and international female founders driving collective impact." }
  ]'::jsonb,
  '[
    { "title": "Curated Mentorship", "description": "1:1 and small-group feedback from seasoned corporate leaders, operators, and investors." },
    { "title": "Visibility & Platform", "description": "Spotlight across ABCN channels, Frankfurt ecosystem partners, and regional media." },
    { "title": "Micro-Grant Eligibility", "description": "Opportunity to win one of three €1,000 equity-free grants at the closing summit." },
    { "title": "Long-Term Alumni Access", "description": "Continued access to the ABCN network, future programme cohorts, and partner perks." }
  ]'::jsonb,
  'Female Innovation Afropean Leadership Initiative (FIALI)',
  'FIALI · FRANKFURT 2026',
  'Förderung internationaler Gründerinnen in Frankfurt durch intensive Geschäftsentwicklung, KI und Digitalisierung, Mentoring, Matchmaking und Zugang zum Ökosystem.',
  'Ein zweiteiliges Pilotprogramm, das 10–15 internationale Gründerinnen aus Frankfurt am Main zusammenbringt, um Geschäftsmodelle zu stärken und sie direkt mit dem Wirtschafts- und Innovationsökosystem der Stadt zu vernetzen.',
  'FIALI soll unternehmerisches Potenzial sichtbar machen, durch praxisnahe Workshops und Expertenbegleitung stärkere Unternehmen aufbauen und konkrete Verbindungen zu Unternehmen, Investoren, Business Angels und strategischen Partnern schaffen. Das Programm wird von Harmonie Essome geleitet und rückt afropäische Führung, inklusive Innovation und internationales weibliches Unternehmertum ins Zentrum.',
  'April – Mai 2026',
  'Frankfurt am Main, Deutschland',
  'Jetzt für FIALI 2026 bewerben',
  '15. April 2026'
)
ON CONFLICT (slug) DO NOTHING;
