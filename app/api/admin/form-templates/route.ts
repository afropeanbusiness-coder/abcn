import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { parseForm } from "@/lib/application-form";

export const dynamic = "force-dynamic";

const fail = (error: string, status = 500) => NextResponse.json({ success: false, error }, { status });

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const rows = await query("SELECT id, name, schema, created_at FROM form_templates ORDER BY created_at DESC");
    return NextResponse.json({ success: true, data: rows });
  } catch (err: any) {
    console.error("GET /api/admin/form-templates", err);
    return fail(err.message);
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const { name, schema } = await req.json();
    const form = parseForm(schema);
    if (!String(name || "").trim()) return fail("A template name is required.", 400);
    if (!form) return fail("The form is empty or invalid.", 400);
    const rows = await query<{ id: string }>(
      "INSERT INTO form_templates (name, schema) VALUES ($1, $2) RETURNING id",
      [String(name).trim().slice(0, 120), JSON.stringify(form)]
    );
    return NextResponse.json({ success: true, id: rows[0].id });
  } catch (err: any) {
    console.error("POST /api/admin/form-templates", err);
    return fail(err.message);
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return fail("Template id is required.", 400);
    const rows = await query("DELETE FROM form_templates WHERE id = $1 RETURNING id", [id]);
    if (!rows.length) return fail("Template not found.", 404);
    return NextResponse.json({ success: true, deleted: id });
  } catch (err: any) {
    console.error("DELETE /api/admin/form-templates", err);
    return fail(err.message);
  }
}
