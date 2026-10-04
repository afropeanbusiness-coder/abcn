import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { applicationState } from "@/lib/application-status";
import { checkAccessLink } from "@/lib/access-links";

export const dynamic = "force-dynamic";

/**
 * Public: is this event taking applications right now? Computed on the server
 * (including the applicant cap) so the page and the submission check agree.
 * Only the state and the dates are returned, never the applicant count.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") || "";
  const access = url.searchParams.get("access");
  try {
    const rows = await query<any>(
      `SELECT e.id, e.application_open, e.application_override, e.application_opens_at, e.application_closes_at, e.application_max,
              e.application_closed_message, e.application_closed_message_de,
              (SELECT COUNT(*) FROM event_applications a WHERE a.event_id = e.id) AS n
       FROM events e WHERE e.slug = $1 LIMIT 1`,
      [slug]
    );
    const e = rows[0];
    if (!e) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    let state = applicationState(e, { count: Number(e.n) });
    let viaLink = false;
    // A valid private link opens a window that is closed by schedule or cap,
    // but never overrides the master switch or an admin's manual close.
    if (state !== "open" && state !== "off" && e.application_override !== "closed" && access) {
      if ((await checkAccessLink(e.id, access)).ok) {
        state = "open";
        viaLink = true;
      }
    }
    return NextResponse.json(
      {
        success: true,
        state,
        viaLink,
        opensAt: e.application_opens_at,
        closesAt: e.application_closes_at,
        message: e.application_closed_message,
        message_de: e.application_closed_message_de,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("GET /api/application-status", err);
    return NextResponse.json({ success: false, error: "Unavailable" }, { status: 500 });
  }
}
