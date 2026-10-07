import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { DEFAULT_EMAIL_TEMPLATES, EmailTemplateConfig } from "@/lib/email";

export const dynamic = "force-dynamic";

const fail = (error: string, status = 500) =>
  NextResponse.json({ success: false, error }, { status });

/**
 * GET /api/admin/email-templates
 * Retrieves all saved email templates from PostgreSQL, falling back to default seeded templates.
 */
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const rows = await query<any>(
      `SELECT id, name, category, description, subject, eyebrow, headline, body,
              header_image_url, show_reference_id, show_summary_table, next_steps_title,
              next_steps_items, cta_text, cta_url, footer_note, is_default,
              created_at, updated_at
       FROM email_templates
       ORDER BY is_default DESC, created_at ASC`
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: true, data: DEFAULT_EMAIL_TEMPLATES });
    }

    const data: EmailTemplateConfig[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      description: r.description,
      subject: r.subject,
      eyebrow: r.eyebrow,
      headline: r.headline,
      body: r.body,
      header_image_url: r.header_image_url,
      show_reference_id: r.show_reference_id !== false,
      show_summary_table: r.show_summary_table !== false,
      next_steps_title: r.next_steps_title,
      next_steps_items: Array.isArray(r.next_steps_items) ? r.next_steps_items : [],
      cta_text: r.cta_text,
      cta_url: r.cta_url,
      footer_note: r.footer_note,
      is_default: r.is_default === true,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.warn("[GET /api/admin/email-templates error, fallback to defaults]", err.message);
    return NextResponse.json({ success: true, data: DEFAULT_EMAIL_TEMPLATES });
  }
}

/**
 * POST /api/admin/email-templates
 * Saves or creates an email template in PostgreSQL.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const id = String(body.id || `custom-${Date.now()}`).trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    const name = String(body.name || "Untitled Template").trim();
    const category = String(body.category || "Custom").trim();
    const subject = String(body.subject || "Application Received: {{event_title}} — ABCN").trim();
    const headline = String(body.headline || "Thank you for applying, {{first_name}}!").trim();
    const emailBody = String(body.body || "").trim();

    if (!name) return fail("Template name is required.", 400);
    if (!subject) return fail("Email subject is required.", 400);
    if (!headline) return fail("Email headline is required.", 400);

    const rows = await query<{ id: string }>(
      `INSERT INTO email_templates (
        id, name, category, description, subject, eyebrow, headline, body,
        header_image_url, show_reference_id, show_summary_table, next_steps_title,
        next_steps_items, cta_text, cta_url, footer_note, is_default, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW()
      ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        description = EXCLUDED.description,
        subject = EXCLUDED.subject,
        eyebrow = EXCLUDED.eyebrow,
        headline = EXCLUDED.headline,
        body = EXCLUDED.body,
        header_image_url = EXCLUDED.header_image_url,
        show_reference_id = EXCLUDED.show_reference_id,
        show_summary_table = EXCLUDED.show_summary_table,
        next_steps_title = EXCLUDED.next_steps_title,
        next_steps_items = EXCLUDED.next_steps_items,
        cta_text = EXCLUDED.cta_text,
        cta_url = EXCLUDED.cta_url,
        footer_note = EXCLUDED.footer_note,
        updated_at = NOW()
      RETURNING id`,
      [
        id,
        name,
        category,
        body.description || "",
        subject,
        body.eyebrow || "",
        headline,
        emailBody,
        body.header_image_url || null,
        body.show_reference_id !== false,
        body.show_summary_table !== false,
        body.next_steps_title || null,
        JSON.stringify(Array.isArray(body.next_steps_items) ? body.next_steps_items : []),
        body.cta_text || null,
        body.cta_url || null,
        body.footer_note || null,
        body.is_default === true,
      ]
    );

    return NextResponse.json({
      success: true,
      id: rows[0].id,
      message: "Email template saved successfully.",
    });
  } catch (err: any) {
    console.error("POST /api/admin/email-templates error:", err);
    return fail(err.message || "Failed to save email template.");
  }
}

/**
 * DELETE /api/admin/email-templates?id=...
 */
export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return fail("Template ID is required.", 400);

    // Prevent deletion of default core template
    if (id === "standard-confirmation") {
      return fail("The default standard confirmation template cannot be deleted.", 400);
    }

    const rows = await query("DELETE FROM email_templates WHERE id = $1 RETURNING id", [id]);
    if (!rows.length) return fail("Template not found.", 404);

    return NextResponse.json({ success: true, deleted: id, message: "Template deleted successfully." });
  } catch (err: any) {
    console.error("DELETE /api/admin/email-templates error:", err);
    return fail(err.message || "Failed to delete template.");
  }
}
