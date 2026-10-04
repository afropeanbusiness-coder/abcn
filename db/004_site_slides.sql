-- Homepage slideshow, managed from the CMS (Slideshow tab).
CREATE TABLE IF NOT EXISTS site_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  kicker TEXT DEFAULT '',
  location TEXT DEFAULT '',
  tag TEXT DEFAULT '',
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  kicker_de TEXT,
  location_de TEXT,
  tag_de TEXT,
  title_de TEXT,
  description_de TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_site_slides_order ON site_slides(sort_order);

-- Seed the slides that were previously hard-coded, once, if the table is empty.
INSERT INTO site_slides
  (image_url, width, height, kicker, location, tag, title, description,
   kicker_de, location_de, tag_de, title_de, description_de, sort_order)
SELECT * FROM (
  VALUES
    ('/assets/abcn/events/alumni-community-group.jpg', 2000, 1333, 'Alumni Event', 'Community Gathering', 'Alumni Network', 'Welcoming the Alumni Community', 'Members, alumni and partners coming together to celebrate progress, share wins and open the next round of introductions.', 'Alumni-Event', 'Community-Treffen', 'Alumni-Netzwerk', 'Willkommen in der Alumni-Community', 'Mitglieder, Alumni und Partner kommen zusammen, um Fortschritte zu feiern, Erfolge zu teilen und neue Kontakte zu knüpfen.', 10),
    ('/assets/abcn/events/fireside-stage-keynote.jpg', 2000, 1333, 'Fireside Session', 'Business & Personal Development', 'Leadership & Strategy', 'Candid Conversations on Business & Growth', 'Harmonie Essome in an open fireside format, sharing practical lessons on building lasting ventures and personal leadership.', 'Fireside-Gespräch', 'Business & persönliche Entwicklung', 'Führung & Strategie', 'Offene Gespräche über Business & Wachstum', 'Harmonie Essome im offenen Fireside-Format mit praxisnahen Erfahrungen zum Aufbau tragfähiger Unternehmen und zu persönlicher Führung.', 20),
    ('/assets/abcn/events/rooftop-terrace-group.jpg', 1227, 1534, 'Rooftop Meetup', 'Frankfurt', 'Community', 'Above the City, Closer Together', 'A relaxed rooftop gathering where founders, professionals and friends of the network build trust against the city skyline.', 'Rooftop-Treffen', 'Frankfurt', 'Community', 'Über der Stadt, näher beieinander', 'Ein entspanntes Treffen auf der Dachterrasse, bei dem Gründer, Fachkräfte und Freunde des Netzwerks vor der Skyline Vertrauen aufbauen.', 40),
    ('/assets/abcn/events/networking-evening-group.jpg', 2000, 1328, 'Networking Evening', 'Women''s Network', 'Connection', 'Where Conversations Become Collaborations', 'An evening of introductions, shared stories and new partnerships among women building businesses across the region.', 'Networking-Abend', 'Frauen-Netzwerk', 'Vernetzung', 'Wo aus Gesprächen Kooperationen werden', 'Ein Abend voller Begegnungen, Geschichten und neuer Partnerschaften unter Frauen, die in der Region Unternehmen aufbauen.', 50),
    ('/assets/abcn/events/peer-circle-women.jpg', 1600, 2000, 'Peer Circle', 'Community Circle', 'Peer Learning', 'Learning From Each Other''s Journeys', 'Small-group listening and exchange where founders compare experiences and take home ideas they can use the next day.', 'Peer Circle', 'Community-Runde', 'Peer-Learning', 'Voneinander lernen', 'Zuhören und Austausch in kleiner Runde, in der Gründerinnen Erfahrungen vergleichen und Ideen für den nächsten Tag mitnehmen.', 60),
    ('/assets/abcn/events/international-womens-day.jpg', 607, 1080, 'Women''s Day', 'Internationaler Frauentag', 'Celebration', 'Celebrating International Women''s Day', 'Women from business and community gathering to mark International Women''s Day with visibility and solidarity.', 'Frauentag', 'Internationaler Frauentag', 'Feier', 'Internationaler Frauentag gemeinsam feiern', 'Frauen aus Wirtschaft und Community kommen zusammen, um den Internationalen Frauentag mit Sichtbarkeit und Solidarität zu begehen.', 80)
) AS v(image_url, width, height, kicker, location, tag, title, description,
       kicker_de, location_de, tag_de, title_de, description_de, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM site_slides LIMIT 1);
