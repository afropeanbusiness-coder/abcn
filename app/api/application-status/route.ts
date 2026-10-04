import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { applicationState } from "@/lib/application-status";

export const dynamic = "force-dynamic";

/**
 * Public: is this event taking applications right now? Computed on the server
 * (including the applicant cap) so the page and the submission check agree.
 * Only the state and the dates are returned, never the applicant count.
 */
export async function GET(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get("slug") || "";
  try {
    const rows = await query<any>(
      `SELECT e.id, e.application_open, e.application_opens_at, e.application_closes_at, e.application_max,
              e.application_closed_message, e.application_closed_message_de,
              (SELECT COUNT(*) FROM event_applications a WHERE a.event_id = e.id) AS n
       FROM events e WHERE e.slug = $1 LIMIT 1`,
      [slug]
    );
    const e = rows[0];
    if (!e) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json(
      {
        success: true,
        state: applicationState(e, { count: Number(e.n) }),
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
