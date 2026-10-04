-- Application windows: optional open/close times and an applicant cap per event.
ALTER TABLE events ADD COLUMN IF NOT EXISTS application_opens_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS application_closes_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS application_max INTEGER;
-- Optional extra line shown on the "applications closed" notice.
ALTER TABLE events ADD COLUMN IF NOT EXISTS application_closed_message TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS application_closed_message_de TEXT;
