import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin, adminActor } from "@/lib/admin-auth";
import { newToken } from "@/lib/access-links";

export const dynamic = "force-dynamic";

/**
 * Extensions, manual override and private access links for an event's
 * application window. Every change is written to application_window_log with
 * who made it and the optional reason.
 */

const fail = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });

const WINDOW_COLS =
  "id, application_open, application_override, application_opens_at, application_closes_at, application_max";

async function log(eventId: string, action: string, actor: string, detail: unknown, note?: string) {
  await query(
    "INSERT INTO application_window_log (event_id, action, detail, note, actor) VALUES ($1, $2, $3, $4, $5)",
    [eventId, action, JSON.stringify(detail), (note || "").slice(0, 500) || null, actor]
  );
}

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) return fail("eventId is required.");
  try {
    const [ev, entries, links, count] = await Promise.all([
      query(`SELECT ${WINDOW_COLS} FROM events WHERE id = $1`, [eventId]),
      query(
        "SELECT id, action, detail, note, actor, created_at FROM application_window_log WHERE event_id = $1 ORDER BY created_at DESC LIMIT 30",
        [eventId]
      ),
      query(
        `SELECT id, token, label, expires_at, max_uses, uses, revoked, created_at
         FROM application_access_links WHERE event_id = $1 ORDER BY created_at DESC`,
        [eventId]
      ),
      query("SELECT COUNT(*) AS n FROM event_applications WHERE event_id = $1", [eventId]),
    ]);
    if (!ev[0]) return fail("Event not found.", 404);
    return NextResponse.json({ success: true, event: ev[0], log: entries, links, applications: Number(count[0]?.n || 0) });
  } catch (err: any) {
    console.error("GET /api/admin/application-window", err);
    return fail(err.message, 500);
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const actor = adminActor(req);
  try {
    const body = await req.json();
    const { eventId, action } = body;
    const note = typeof body.note === "string" ? body.note : "";
    if (!eventId) return fail("eventId is required.");

    const cur = (await query<any>(`SELECT ${WINDOW_COLS} FROM events WHERE id = $1`, [eventId]))[0];
    if (!cur) return fail("Event not found.", 404);

    if (action === "extend") {
      let next: Date;
      if (body.closesAt) {
        next = new Date(body.closesAt);
      } else if (Number(body.addDays) > 0 && Number(body.addDays) <= 365) {
        // From the current closing time if it is still ahead, else from now.
        const base = cur.application_closes_at && new Date(cur.application_closes_at).getTime() > Date.now()
          ? new Date(cur.application_closes_at)
          : new Date();
        next = new Date(base.getTime() + Number(body.addDays) * 86400000);
      } else {
        return fail("Give a new closing time or a number of days to add.");
      }
      if (!Number.isFinite(next.getTime())) return fail("That is not a valid date.");
      await query("UPDATE events SET application_closes_at = $1, updated_at = NOW() WHERE id = $2", [next.toISOString(), eventId]);
      await log(eventId, "extend", actor, { from: cur.application_closes_at, to: next.toISOString() }, note);
    } else if (action === "override") {
      const mode = body.mode === "open" || body.mode === "closed" ? body.mode : null;
      await query("UPDATE events SET application_override = $1, updated_at = NOW() WHERE id = $2", [mode, eventId]);
      await log(eventId, "override", actor, { from: cur.application_override, to: mode }, note);
    } else if (action === "createLink") {
      const maxUses = Number(body.maxUses) > 0 ? Math.min(Number(body.maxUses), 1000) : null;
      const expires = body.expiresAt ? new Date(body.expiresAt) : null;
      if (expires && !Number.isFinite(expires.getTime())) return fail("That is not a valid expiry date.");
      const token = newToken();
      const label = String(body.label || "").slice(0, 120);
      const row = await query<{ id: string }>(
        `INSERT INTO application_access_links (event_id, token, label, expires_at, max_uses)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [eventId, token, label, expires ? expires.toISOString() : null, maxUses]
      );
      await log(eventId, "link_created", actor, { linkId: row[0].id, label, maxUses, expires: expires?.toISOString() ?? null }, note);
    } else if (action === "revokeLink") {
      const rows = await query<{ label: string }>(
        "UPDATE application_access_links SET revoked = true WHERE id = $1 AND event_id = $2 RETURNING label",
        [body.linkId, eventId]
      );
      if (!rows.length) return fail("Link not found.", 404);
      await log(eventId, "link_revoked", actor, { linkId: body.linkId, label: rows[0].label }, note);
    } else {
      return fail("Unknown action.");
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("POST /api/admin/application-window", err);
    return fail(err.message, 500);
  }
}
