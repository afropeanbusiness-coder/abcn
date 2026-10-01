import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getEmailSettings, updateEmailSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/settings/email - Retrieve email dispatch toggles and configuration
 */
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const settings = await getEmailSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (err: any) {
    console.error("[GET /api/admin/settings/email error]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to retrieve email settings" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/settings/email - Update email dispatch toggles
 */
export async function PUT(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const updated = await updateEmailSettings({
      send_to_applicant: typeof body.send_to_applicant === "boolean" ? body.send_to_applicant : undefined,
      send_to_admin: typeof body.send_to_admin === "boolean" ? body.send_to_admin : undefined,
      admin_email: typeof body.admin_email === "string" ? body.admin_email : undefined,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Email dispatch settings updated successfully.",
    });
  } catch (err: any) {
    console.error("[PUT /api/admin/settings/email error]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update email settings" },
      { status: 500 }
    );
  }
}
