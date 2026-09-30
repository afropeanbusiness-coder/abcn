import { neon } from "@/lib/neon";
import { query } from "@/lib/db";
import { EventRecord, fallbackEvent, normaliseEvent } from "@/lib/events";

/**
 * Server-side reads of the event CMS, for the things that must exist in the
 * HTML Google receives rather than being fetched by the browser: the sitemap,
 * page metadata and the Event structured data.
 *
 * Direct Postgres queries via Neon connection pooler provide instant, zero-cold-start
 * reads, with graceful fallbacks to PostgREST and the seeded FIALI programme.
 */
export const EVENTS_REVALIDATE = 60;

export async function getPublishedEvents(locale: string = "en"): Promise<EventRecord[]> {
  // Strategy 1: Direct Postgres pooler query (fastest, no 503 gateway timeouts)
  try {
    const rows = await query(
      "SELECT * FROM events WHERE status = $1 ORDER BY priority DESC, created_at DESC",
      ["published"]
    );
    if (rows && rows.length) {
      return rows.map((row) => normaliseEvent(row as Partial<EventRecord>, locale));
    }
  } catch {
    // Strategy 2: Fall back to neon PostgREST client
    try {
      const { data } = await neon
        .from("events")
        .select("*")
        .eq("status", "published")
        .order("priority", { ascending: false });

      if (data?.length) {
        return data.map((row) => normaliseEvent(row as Partial<EventRecord>, locale));
      }
    } catch {
      // Fall through to seeded programme
    }
  }

  return [fallbackEvent(locale)];
}

export async function getEventBySlug(
  slug: string,
  locale: string = "en"
): Promise<EventRecord | null> {
  // Strategy 1: Direct Postgres pooler query
  try {
    const rows = await query(
      "SELECT * FROM events WHERE slug = $1 AND status = $2 LIMIT 1",
      [slug, "published"]
    );
    if (rows && rows[0]) {
      return normaliseEvent(rows[0] as Partial<EventRecord>, locale);
    }
  } catch {
    // Strategy 2: Fall back to neon PostgREST client
    try {
      const { data } = await neon
        .from("events")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .limit(1);

      const row = data?.[0];
      if (row) return normaliseEvent(row as Partial<EventRecord>, locale);
    } catch {
      // Fall through
    }
  }

  const seeded = fallbackEvent(locale);
  return seeded.slug === slug ? seeded : null;
}
