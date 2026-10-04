import { randomBytes } from "crypto";
import { query } from "@/lib/db";

/**
 * Private application access links: ?access=<token> lets someone apply when the
 * window would otherwise refuse them (closed, not yet open, or cap reached).
 * They never bypass an admin's manual "closed" or the master switch.
 */

export const newToken = () => randomBytes(18).toString("base64url");

export interface LinkCheck {
  ok: boolean;
  id?: string;
}

/** Is this token usable for this event right now? (does not consume a use) */
export async function checkAccessLink(eventId: string | null, token: string | null | undefined): Promise<LinkCheck> {
  if (!eventId || !token || token.length > 100) return { ok: false };
  const rows = await query<{ id: string }>(
    `SELECT id FROM application_access_links
     WHERE token = $1 AND event_id = $2 AND NOT revoked
       AND (expires_at IS NULL OR expires_at > NOW())
       AND (max_uses IS NULL OR uses < max_uses)`,
    [token, eventId]
  );
  return rows[0] ? { ok: true, id: rows[0].id } : { ok: false };
}

/** Atomically use up one use; false if the link ran out in the meantime. */
export async function claimAccessLink(id: string): Promise<boolean> {
  const rows = await query(
    `UPDATE application_access_links SET uses = uses + 1
     WHERE id = $1 AND NOT revoked AND (expires_at IS NULL OR expires_at > NOW())
       AND (max_uses IS NULL OR uses < max_uses) RETURNING id`,
    [id]
  );
  return rows.length > 0;
}

/** Give a use back if the application then failed to save. */
export async function releaseAccessLink(id: string): Promise<void> {
  await query("UPDATE application_access_links SET uses = GREATEST(uses - 1, 0) WHERE id = $1", [id]);
}
