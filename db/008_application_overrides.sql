-- Manual override, extension history and private access links for applications.

-- NULL = follow the schedule/cap automatically; 'open' = accept regardless of
-- dates and cap; 'closed' = refuse regardless. Changed only through the
-- logged admin endpoint (/api/admin/application-window).
ALTER TABLE events ADD COLUMN IF NOT EXISTS application_override TEXT
  CHECK (application_override IN ('open', 'closed'));

-- Who changed the application window, when, from what to what, and why.
CREATE TABLE IF NOT EXISTS application_window_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  action TEXT NOT NULL,          -- extend | override | set_window | link_created | link_revoked
  detail JSONB,
  note TEXT,
  actor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_window_log_event ON application_window_log(event_id, created_at DESC);

-- Private links that let specific people apply after the window has closed
-- (or before it opens, or when the cap is reached).
CREATE TABLE IF NOT EXISTS application_access_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT '',
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  uses INTEGER NOT NULL DEFAULT 0,
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_access_links_event ON application_access_links(event_id);
