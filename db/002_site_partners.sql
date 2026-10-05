-- =============================================================================
-- Migration: 002_site_partners.sql
-- Create site_partners table for global website partner management
-- =============================================================================

CREATE TABLE IF NOT EXISTS site_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  category TEXT DEFAULT 'Partner',
  description TEXT,
  tier INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_partners_active ON site_partners(active);
CREATE INDEX IF NOT EXISTS idx_site_partners_priority ON site_partners(priority DESC);

-- Seed initial verified partners if table is empty
INSERT INTO site_partners (name, logo_url, website_url, category, priority, active)
SELECT * FROM (
  VALUES 
    ('SoftXcloud', '/assets/fiali/logos/abcn.png', 'https://softxcloud.com', 'Technology Partner', 10, true),
    ('Mountain Hub', '/assets/fiali/logos/divoc-rising.png', 'https://mountainhub.com', 'Ecosystem Partner', 9, true),
    ('Kompass Frankfurt', '/assets/fiali/logos/kompass-frankfurt.png', 'https://kompassfrankfurt.de', 'Institutional Partner', 8, true),
    ('DIVOC Rising', '/assets/fiali/logos/divoc-rising.png', 'https://divocrising.com', 'Community Partner', 7, true),
    ('Black Women in Tech DACH', '/assets/fiali/logos/black-women-in-tech-dach.png', 'https://bwit-dach.org', 'Community Partner', 6, true)
) AS v(name, logo_url, website_url, category, priority, active)
WHERE NOT EXISTS (SELECT 1 FROM site_partners LIMIT 1);
