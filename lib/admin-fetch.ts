import { neon } from "@/lib/neon";

/**
 * fetch() for /api/admin/* calls: attaches the signed-in CMS user's token so the
 * server can verify who is asking (see lib/admin-auth.ts).
 */
export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  let token: string | null | undefined;
  try {
    token = await (neon.auth as any).getJWTToken?.();
  } catch {
    token = null;
  }
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
