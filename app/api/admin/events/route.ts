import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// List of all modifiable columns in `events`
const EVENT_COLUMNS = [
  "slug",
  "title",
  "eyebrow",
  "short_description",
  "description",
  "long_description",
  "city",
  "country",
  "venue",
  "date_label",
  "start_at",
  "end_at",
  "status",
  "event_type",
  "organizer",
  "hero_image_url",
  "card_image_url",
  "registration_url",
  "featured",
  "priority",
  "show_on_home",
  "theme",
  "accent_color",
  "deep_color",
  "light_color",
  "highlights",
  "stages",
  "eligibility",
  "partners",
  "grants",
  "gallery",
  "application_open",
  "application_deadline",
  "application_cta",
  "focus_areas",
  "benefits",
  "title_de",
  "eyebrow_de",
  "short_description_de",
  "description_de",
  "long_description_de",
  "date_label_de",
  "venue_de",
  "application_cta_de",
  "application_deadline_de",
  "highlights_de",
  "stages_de",
  "eligibility_de",
  "grants_de",
  "focus_areas_de",
  "benefits_de",
  "application_form",
] as const;

const JSON_COLUMNS = new Set([
  "highlights",
  "stages",
  "eligibility",
  "partners",
  "grants",
  "gallery",
  "focus_areas",
  "benefits",
  "highlights_de",
  "stages_de",
  "eligibility_de",
  "grants_de",
  "focus_areas_de",
  "benefits_de",
  "application_form",
]);

function sanitizePayload(body: any): Record<string, any> {
  const result: Record<string, any> = {};
  for (const col of EVENT_COLUMNS) {
    if (col in body) {
      const val = body[col];
      if (JSON_COLUMNS.has(col)) {
        result[col] = val == null ? null : typeof val === "string" ? val : JSON.stringify(val);
      } else {
        result[col] = val === undefined ? null : val;
      }
    }
  }
  return result;
}

export async function GET() {
  try {
    const rows = await query(
      "SELECT * FROM events ORDER BY priority DESC, created_at DESC"
    );
    return NextResponse.json({ data: rows, error: null });
  } catch (err: any) {
    console.error("[GET /api/admin/events error]", err);
    return NextResponse.json(
      { data: null, error: err.message || "Failed to load events" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sanitized = sanitizePayload(body);

    if (!sanitized.title || !sanitized.slug) {
      return NextResponse.json(
        { data: null, error: "Title and slug are required." },
        { status: 400 }
      );
    }

    const cols = Object.keys(sanitized);
    const values = cols.map((c) => sanitized[c]);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");

    const sql = `
      INSERT INTO events (${cols.join(", ")})
      VALUES (${placeholders})
      RETURNING *;
    `;

    const rows = await query(sql, values);
    return NextResponse.json({ data: rows[0], error: null }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/admin/events error]", err);
    return NextResponse.json(
      { data: null, error: err.message || "Failed to create event" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body.id;
    if (!id) {
      return NextResponse.json(
        { data: null, error: "Event ID is required for update." },
        { status: 400 }
      );
    }

    const sanitized = sanitizePayload(body);
    const cols = Object.keys(sanitized);
    if (cols.length === 0) {
      return NextResponse.json(
        { data: null, error: "No fields provided to update." },
        { status: 400 }
      );
    }

    const setClauses = cols.map((col, idx) => `${col} = $${idx + 1}`).join(", ");
    const values = [...cols.map((c) => sanitized[c]), id];

    const sql = `
      UPDATE events
      SET ${setClauses}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING *;
    `;

    const rows = await query(sql, values);
    if (!rows.length) {
      return NextResponse.json(
        { data: null, error: "Event not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: rows[0], error: null });
  } catch (err: any) {
    console.error("[PUT /api/admin/events error]", err);
    return NextResponse.json(
      { data: null, error: err.message || "Failed to update event" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { data: null, error: "Event ID is required." },
        { status: 400 }
      );
    }

    // Cascade: delete applications for this event first to maintain integrity
    await query("DELETE FROM event_applications WHERE event_id = $1", [id]);
    const rows = await query("DELETE FROM events WHERE id = $1 RETURNING id", [id]);

    if (!rows.length) {
      return NextResponse.json(
        { data: null, error: "Event not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { id }, error: null });
  } catch (err: any) {
    console.error("[DELETE /api/admin/events error]", err);
    return NextResponse.json(
      { data: null, error: err.message || "Failed to delete event" },
      { status: 500 }
    );
  }
}
