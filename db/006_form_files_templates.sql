-- File uploads for custom application questions, and reusable form templates.

-- Uploaded files live in the database. A file is "pending" (application_id NULL)
-- from upload until the application is submitted; pending files older than a day
-- are removed opportunistically. Deleting an application deletes its files.
CREATE TABLE IF NOT EXISTS application_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  application_id UUID REFERENCES event_applications(id) ON DELETE CASCADE,
  field_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_application_files_app ON application_files(application_id);
CREATE INDEX IF NOT EXISTS idx_application_files_pending ON application_files(created_at) WHERE application_id IS NULL;

-- Named form templates an admin can start a new event's form from.
CREATE TABLE IF NOT EXISTS form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  schema JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
