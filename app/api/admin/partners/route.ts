import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const rows = await query(
      `SELECT * FROM site_partners 
       ORDER BY priority DESC, created_at ASC`
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error("GET /api/admin/partners error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch partners" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const body = await req.json();
    const {
      name,
      logo_url = "",
      website_url = "",
      category = "Partner",
      description = "",
      tier = 1,
      priority = 0,
      active = true,
    } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: "Partner name is required" },
        { status: 400 }
      );
    }

    const rows = await query(
      `INSERT INTO site_partners (
        name, logo_url, website_url, category, description, tier, priority, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [name.trim(), logo_url, website_url, category, description, Number(tier) || 1, Number(priority) || 0, Boolean(active)]
    );

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error: any) {
    console.error("POST /api/admin/partners error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create partner" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const body = await req.json();
    const { id, name, logo_url, website_url, category, description, tier, priority, active } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Partner id is required" },
        { status: 400 }
      );
    }

    const rows = await query(
      `UPDATE site_partners SET
        name = COALESCE($1, name),
        logo_url = COALESCE($2, logo_url),
        website_url = COALESCE($3, website_url),
        category = COALESCE($4, category),
        description = COALESCE($5, description),
        tier = COALESCE($6, tier),
        priority = COALESCE($7, priority),
        active = COALESCE($8, active),
        updated_at = NOW()
      WHERE id = $9
      RETURNING *`,
      [
        name ? name.trim() : null,
        logo_url !== undefined ? logo_url : null,
        website_url !== undefined ? website_url : null,
        category !== undefined ? category : null,
        description !== undefined ? description : null,
        tier !== undefined ? Number(tier) : null,
        priority !== undefined ? Number(priority) : null,
        active !== undefined ? Boolean(active) : null,
        id,
      ]
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "Partner not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error: any) {
    console.error("PUT /api/admin/partners error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update partner" },
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
        { success: false, error: "Partner id is required" },
        { status: 400 }
      );
    }

    const rows = await query(`DELETE FROM site_partners WHERE id = $1 RETURNING id`, [id]);
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "Partner not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted: id });
  } catch (error: any) {
    console.error("DELETE /api/admin/partners error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete partner" },
      { status: 500 }
    );
  }
}
