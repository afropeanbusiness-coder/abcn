import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** Admin-only download of a file an applicant uploaded. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });

  try {
    const rows = await query<{ filename: string; mime: string; data: Buffer }>(
      "SELECT filename, mime, data FROM application_files WHERE id = $1 AND application_id IS NOT NULL",
      [id]
    );
    if (!rows[0]) return new NextResponse("Not found", { status: 404 });
    const { filename, mime, data } = rows[0];
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": mime,
        // Always a download, never rendered in the admin's browser origin.
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/applications/files]", err);
    return new NextResponse("Unavailable", { status: 500 });
  }
}
