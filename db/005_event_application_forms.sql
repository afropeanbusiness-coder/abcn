-- Customisable application forms.
-- events.application_form is NULL for events using the built-in default form;
-- when an admin customises a form it holds the full schema (steps + fields).
ALTER TABLE events ADD COLUMN IF NOT EXISTS application_form JSONB;

-- Answers to custom (non-standard) questions, stored with the question text as
-- it was when the applicant answered: { "<fieldId>": { "label": "...", "value": ... } }
ALTER TABLE event_applications ADD COLUMN IF NOT EXISTS answers JSONB;
