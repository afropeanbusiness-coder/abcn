import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    let sql = `
      SELECT a.*, e.title as event_title, e.slug as event_slug
      FROM event_applications a
      LEFT JOIN events e ON a.event_id = e.id
    `;
    const params: any[] = [];

    if (eventId) {
      sql += ` WHERE a.event_id = $1`;
      params.push(eventId);
    }

    sql += ` ORDER BY a.submitted_at DESC`;

    const rows = await query(sql, params);
    return NextResponse.json({ data: rows, error: null });
  } catch (err: any) {
    console.error("[GET /api/admin/applications error]", err);
    return NextResponse.json(
      { data: null, error: err.message || "Failed to load applications" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const body = await req.json();
    const { id, status, admin_notes } = body;

    if (!id) {
      return NextResponse.json(
        { data: null, error: "Application ID is required." },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (status !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(status);
    }

    if (admin_notes !== undefined) {
      updates.push(`admin_notes = $${idx++}`);
      values.push(admin_notes);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { data: null, error: "No fields provided to update." },
        { status: 400 }
      );
    }

    values.push(id);
    const sql = `
      UPDATE event_applications
      SET ${updates.join(", ")}
      WHERE id = $${idx}
      RETURNING *;
    `;

    const rows = await query(sql, values);
    if (!rows.length) {
      return NextResponse.json(
        { data: null, error: "Application not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: rows[0], error: null });
  } catch (err: any) {
    console.error("[PATCH /api/admin/applications error]", err);
    return NextResponse.json(
      { data: null, error: err.message || "Failed to update application" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { data: null, error: "Application ID is required." },
        { status: 400 }
      );
    }

    const rows = await query(
      "DELETE FROM event_applications WHERE id = $1 RETURNING id",
      [id]
    );

    if (!rows.length) {
      return NextResponse.json(
        { data: null, error: "Application not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { id }, error: null });
  } catch (err: any) {
    console.error("[DELETE /api/admin/applications error]", err);
    return NextResponse.json(
      { data: null, error: err.message || "Failed to delete application" },
      { status: 500 }
    );
  }
}
