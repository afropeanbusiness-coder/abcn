import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { hashPassword } from "@better-auth/utils/password";
import { sendEmail, buildAdminInviteHtml } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users - List administrators
 */
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const users = await query<{
      id: string;
      name: string | null;
      email: string;
      role: string | null;
      createdAt: string;
    }>(
      `SELECT id, name, email, role, "createdAt" 
       FROM neon_auth."user" 
       ORDER BY "createdAt" DESC;`
    );

    return NextResponse.json({ success: true, data: users });
  } catch (err: any) {
    console.error("[GET /api/admin/users error]", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to load users" }, { status: 500 });
  }
}

/**
 * POST /api/admin/users - Create/invite a new administrator
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const name = String(body.name || "").trim() || "ABCN Administrator";
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();
    const sendInvite = Boolean(body.sendInvite !== false);

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "A valid email address is required." }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ success: false, error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    // Check if user already exists
    const existing = await query<{ id: string }>(
      `SELECT id FROM neon_auth."user" WHERE email = $1 LIMIT 1;`,
      [email]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: `An account with email "${email}" already exists.` },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const now = new Date();

    // Generate UUIDs
    const newUserId = (await query<{ id: string }>("SELECT gen_random_uuid() as id;"))[0].id;
    const newAccountId = (await query<{ id: string }>("SELECT gen_random_uuid() as id;"))[0].id;

    // Insert user into neon_auth.user
    await query(
      `INSERT INTO neon_auth."user" (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, true, 'admin', $4, $4);`,
      [newUserId, name, email, now]
    );

    // Insert credential account into neon_auth.account
    await query(
      `INSERT INTO neon_auth."account" (id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt")
       VALUES ($1, $2, $2, 'credential', $3, $4, $4);`,
      [newAccountId, newUserId, hashedPassword, now]
    );

    // Optionally send invite email
    if (sendInvite) {
      try {
        const inviteHtml = buildAdminInviteHtml({
          name,
          email,
          tempPassword: password,
          invitedBy: "ABCN Executive Administration",
        });

        sendEmail({
          to: email,
          subject: "Administrator Access Granted — ABCN Executive Portal",
          html: inviteHtml,
        }).catch((err) => {
          console.error("[Admin Invite Email Send Failed]:", err);
        });
      } catch (err) {
        console.error("[Admin Invite Email Build Failed]:", err);
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: { id: newUserId, name, email, role: "admin", createdAt: now.toISOString() },
        message: `Administrator account for ${email} created successfully.`,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/admin/users error]", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to create administrator." }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users - Remove an administrator
 */
export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "User ID is required." }, { status: 400 });
    }

    // Delete accounts first then user
    await query(`DELETE FROM neon_auth."account" WHERE "userId" = $1;`, [id]);
    await query(`DELETE FROM neon_auth."user" WHERE id = $1;`, [id]);

    return NextResponse.json({ success: true, message: "Administrator account removed." });
  } catch (err: any) {
    console.error("[DELETE /api/admin/users error]", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to delete user." }, { status: 500 });
  }
}
