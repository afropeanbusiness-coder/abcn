import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const TEXT_FIELDS = [
  "kicker", "location", "tag", "title", "description",
  "kicker_de", "location_de", "tag_de", "title_de", "description_de",
  "video_url",
] as const;

// Uploaded photos are stored inline as data URLs; keep them a sane size.
const MAX_IMAGE_CHARS = 2_500_000;

function clean(body: any) {
  const out: Record<string, any> = {};
  for (const f of TEXT_FIELDS) if (f in body) out[f] = body[f] == null ? null : String(body[f]).slice(0, 2000);
  if ("image_url" in body) {
    const v = String(body.image_url || "");
    if (v.length > MAX_IMAGE_CHARS) throw new Error("Image is too large. Please upload a smaller photo.");
    out.image_url = v;
  }
  if ("width" in body) out.width = Number(body.width) || null;
  if ("height" in body) out.height = Number(body.height) || null;
  if ("sort_order" in body) out.sort_order = Number(body.sort_order) || 0;
  if ("active" in body) out.active = Boolean(body.active);
  return out;
}

const fail = (error: any, status = 500) =>
  NextResponse.json({ success: false, error: error?.message || String(error) }, { status });

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    // The CMS list keeps the image as a short reference, never the base64.
    const rows = await query(
      `SELECT id, CASE WHEN image_url LIKE 'data:%' THEN '/api/slides/image/' || id || '?v=' || EXTRACT(EPOCH FROM updated_at)::bigint
                       ELSE image_url END AS image_url,
              video_url,
              width, height, kicker, location, tag, title, description,
              kicker_de, location_de, tag_de, title_de, description_de,
              sort_order, active
       FROM site_slides ORDER BY sort_order ASC, created_at ASC`
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("GET /api/admin/slides error:", error);
    return fail(error);
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const f = clean(await req.json());
    if (!f.image_url) return fail("A photo is required.", 400);
    if (f.sort_order === undefined) {
      const max = await query(`SELECT COALESCE(MAX(sort_order), 0) AS m FROM site_slides`);
      f.sort_order = Number(max[0]?.m || 0) + 10;
    }
    const cols = Object.keys(f);
    const rows = await query(
      `INSERT INTO site_slides (${cols.join(", ")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING id`,
      cols.map((c) => f[c])
    );
    return NextResponse.json({ success: true, id: rows[0].id });
  } catch (error: any) {
    console.error("POST /api/admin/slides error:", error);
    return fail(error, /too large/i.test(error?.message) ? 400 : 500);
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const body = await req.json();
    if (!body.id) return fail("Slide id is required.", 400);
    const f = clean(body);
    const cols = Object.keys(f);
    if (!cols.length) return fail("Nothing to update.", 400);
    const rows = await query(
      `UPDATE site_slides SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(", ")}, updated_at = NOW()
       WHERE id = $${cols.length + 1} RETURNING id`,
      [...cols.map((c) => f[c]), body.id]
    );
    if (!rows.length) return fail("Slide not found.", 404);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PUT /api/admin/slides error:", error);
    return fail(error, /too large/i.test(error?.message) ? 400 : 500);
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return fail("Slide id is required.", 400);
    const rows = await query(`DELETE FROM site_slides WHERE id = $1 RETURNING id`, [id]);
    if (!rows.length) return fail("Slide not found.", 404);
    return NextResponse.json({ success: true, deleted: id });
  } catch (error) {
    console.error("DELETE /api/admin/slides error:", error);
    return fail(error);
  }
}
