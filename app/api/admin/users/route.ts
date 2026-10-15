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

    const hashedPassword = await hashPassword(password);
    const now = new Date();

    // Is there already an account for this email?
    const existing = await query<{ id: string; has_credential: boolean }>(
      `SELECT u.id,
              EXISTS (SELECT 1 FROM neon_auth."account" a WHERE a."userId" = u.id AND a."providerId" = 'credential') AS has_credential
       FROM neon_auth."user" u WHERE u.email = $1 LIMIT 1;`,
      [email]
    );

    let newUserId: string;
    let completed = false;

    if (existing.length > 0 && existing[0].has_credential) {
      return NextResponse.json(
        { success: false, error: `An account with email "${email}" already exists.` },
        { status: 409 }
      );
    } else if (existing.length > 0) {
      // The person exists but has no password login (an earlier attempt that failed halfway, or a
      // social sign-in only account). Finish the job instead of leaving them stuck.
      newUserId = existing[0].id;
      completed = true;
      await query(
        `WITH u AS (UPDATE neon_auth."user" SET role = 'admin', name = $2, "emailVerified" = true, "updatedAt" = $3 WHERE id = $1::uuid RETURNING id)
         INSERT INTO neon_auth."account" (id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt")
         SELECT gen_random_uuid(), u.id, u.id::text, 'credential', $4, $3, $3 FROM u;`,
        [newUserId, name, now, hashedPassword]
      );
    } else {
      newUserId = (await query<{ id: string }>("SELECT gen_random_uuid() AS id;"))[0].id;
      // One statement, so the user and their login are created together or not at all.
      // (Two separate inserts used to leave a user with no login whenever the second one failed.)
      await query(
        `WITH u AS (
           INSERT INTO neon_auth."user" (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
           VALUES ($1::uuid, $2, $3, true, 'admin', $4, $4) RETURNING id
         )
         INSERT INTO neon_auth."account" (id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt")
         SELECT gen_random_uuid(), u.id, u.id::text, 'credential', $5, $4, $4 FROM u;`,
        [newUserId, name, email, now, hashedPassword]
      );
    }

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
        message: completed
          ? `The account for ${email} was incomplete and has now been finished. They can sign in with the password you set.`
          : `Administrator account for ${email} created successfully.`,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/admin/users error]", err);
    if (err?.code === "23505") {
      return NextResponse.json({ success: false, error: "An account with that email already exists." }, { status: 409 });
    }
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
