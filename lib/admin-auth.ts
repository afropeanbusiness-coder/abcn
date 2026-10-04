import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";
import { query } from "@/lib/db";

/**
 * Server-side guard for every /api/admin/* route.
 *
 * The CMS signs in through Neon Auth. The browser sends the signed-in user's
 * JWT as `Authorization: Bearer <token>`; here the signature is checked against
 * the auth service's published keys and the user's role is read from the
 * database, so nothing the browser claims about itself is trusted.
 *
 * Emergency switch: setting ADMIN_AUTH_ENFORCE=off in the hosting environment
 * disables the check (for example if the auth service is down). Leave it unset.
 */

const AUTH_URL =
  process.env.NEXT_PUBLIC_NEON_AUTH_URL ||
  "https://ep-round-king-b126bwc2.neonauth.c-5.eu-central-1.aws.neon.tech/neondb/auth";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
const keys = () => (jwks ??= createRemoteJWKSet(new URL(`${AUTH_URL}/.well-known/jwks.json`)));

const deny = (status: 401 | 403, error: string) =>
  NextResponse.json({ success: false, data: null, error }, { status });

/** Returns a response to send back when the caller is not an admin, else null. */
export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  if (process.env.ADMIN_AUTH_ENFORCE === "off") return null;

  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return deny(401, "Sign in to the CMS to do this.");

  let userId: string | undefined;
  try {
    const { payload } = await jwtVerify(token, keys());
    // A signed token that itself carries the admin role is enough.
    if (String((payload as any).role || "").includes("admin")) return null;
    userId = typeof payload.sub === "string" ? payload.sub : undefined;
  } catch {
    return deny(401, "Your session has expired. Please sign in again.");
  }
  if (!userId) return deny(401, "Invalid session.");

  try {
    const rows = await query<{ role: string | null }>(
      `SELECT role FROM neon_auth."user" WHERE id = $1 LIMIT 1`,
      [userId]
    );
    if (!String(rows[0]?.role || "").includes("admin")) {
      return deny(403, "This account does not have CMS admin access.");
    }
  } catch (err) {
    console.error("[requireAdmin] role lookup failed", err);
    return deny(403, "Could not verify admin access.");
  }
  return null;
}

/**
 * Who is making an admin request, for the audit log. Call only after
 * requireAdmin() has accepted the request; the token is then known to be valid.
 */
export function adminActor(req: NextRequest): string {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  try {
    const p: any = decodeJwt(token);
    return String(p.email || p.sub || "admin");
  } catch {
    return "admin";
  }
}
