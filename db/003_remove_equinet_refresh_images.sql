-- Remove EquiNet as a partner everywhere it may have been stored.
DELETE FROM site_partners WHERE name ILIKE '%equinet%' OR logo_url ILIKE '%equinet%';

UPDATE events
SET partners = COALESCE((
  SELECT jsonb_agg(p)
  FROM jsonb_array_elements(partners) AS p
  WHERE p::text NOT ILIKE '%equinet%'
), '[]'::jsonb)
WHERE jsonb_typeof(partners) = 'array' AND partners::text ILIKE '%equinet%';

-- Point the FIALI event at unique, real photography (no image reused elsewhere).
UPDATE events
SET hero_image_url = '/assets/abcn/events/female-founders-lineup.jpg',
    card_image_url = '/assets/abcn/events/workshop-listening-session.jpg'
WHERE slug = 'fiali-frankfurt-2026';

UPDATE events
SET stages = (
  SELECT jsonb_agg(
    CASE
      WHEN s->>'stage' ~* '1' THEN jsonb_set(s, '{image}', '"/assets/abcn/events/sales-lab-workshop-room.jpg"')
      ELSE jsonb_set(s, '{image}', '"/assets/abcn/events/business-development-talk.jpg"')
    END
    ORDER BY ord)
  FROM jsonb_array_elements(stages) WITH ORDINALITY AS t(s, ord)
)
WHERE slug = 'fiali-frankfurt-2026' AND jsonb_typeof(stages) = 'array';
