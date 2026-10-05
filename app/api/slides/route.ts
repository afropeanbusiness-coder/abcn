import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Public read of the homepage slideshow, localised.
 *
 * An empty table is a real answer (the editor removed every slide) and is
 * returned as an empty list. Only a database failure is reported as an error,
 * so the page can decide to show its bundled fallback.
 */
export async function GET(req: NextRequest) {
  const de = new URL(req.url).searchParams.get("locale") === "de";
  try {
    const rows = await query(
      `SELECT id, image_url, video_url, width, height, kicker, location, tag, title, description,
              kicker_de, location_de, tag_de, title_de, description_de,
              EXTRACT(EPOCH FROM updated_at)::bigint AS v
       FROM site_slides
       WHERE active = true
       ORDER BY sort_order ASC, created_at ASC`
    );
    const pick = (en: string | null, deVal: string | null) =>
      (de && deVal && deVal.trim() ? deVal : en) || "";
    const data = rows.map((r: any) => ({
      id: r.id,
      // Uploaded photos live in the database; serve them from a cacheable URL
      // instead of inlining megabytes of base64 into this response.
      image: String(r.image_url).startsWith("data:")
        ? `/api/slides/image/${r.id}?v=${r.v}`
        : r.image_url,
      video: r.video_url || null,
      width: r.width || null,
      height: r.height || null,
      kicker: pick(r.kicker, r.kicker_de),
      location: pick(r.location, r.location_de),
      tag: pick(r.tag, r.tag_de),
      title: pick(r.title, r.title_de),
      desc: pick(r.description, r.description_de),
    }));
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET /api/slides error:", error);
    return NextResponse.json({ success: false, error: "Failed to load slides" }, { status: 500 });
  }
}
