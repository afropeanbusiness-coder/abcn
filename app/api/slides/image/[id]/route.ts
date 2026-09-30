import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Serves a slide photo that was uploaded through the CMS (stored as a data URL)
 * as a real image. The public slides API appends ?v=<updated_at>, so the URL
 * changes whenever the photo does and the response can be cached for a year.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });

  try {
    const rows = await query(`SELECT image_url FROM site_slides WHERE id = $1`, [id]);
    const src: string | undefined = rows[0]?.image_url;
    const match = src?.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
    if (!match) return new NextResponse("Not found", { status: 404 });

    return new NextResponse(Buffer.from(match[2], "base64"), {
      headers: {
        "Content-Type": match[1],
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("GET /api/slides/image error:", error);
    return new NextResponse("Unavailable", { status: 500 });
  }
}
