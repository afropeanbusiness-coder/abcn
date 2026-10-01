import { neon } from "@/lib/neon";

let currentAdminToken: string | null = null;

const TOKEN_KEY = "abcn_admin_jwt";

/**
 * Stores the authenticated JWT token in memory and local session storage.
 */
export function setAdminToken(token: string | null) {
  currentAdminToken = token;
  if (typeof window !== "undefined") {
    try {
      if (token) {
        sessionStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        sessionStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // Ignore storage access errors in restricted iframe/browser modes
    }
  }
}

/**
 * Resolves the active admin JWT token.
 * Uses cached memory/storage first, and falls back to neon.auth.getSession().
 * NOTE: Never call neon.auth.getJWTToken() as neon.auth is a Better-Auth proxy
 * which triggers invalid endpoint route requests if non-existent methods are called.
 */
export async function getAdminToken(): Promise<string | null> {
  if (currentAdminToken) return currentAdminToken;

  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
      if (stored) {
        currentAdminToken = stored;
        return stored;
      }
    } catch {
      // Storage unavailable
    }
  }

  try {
    const sessionRes = await neon.auth.getSession();
    const token =
      (sessionRes?.data as any)?.session?.token ||
      (sessionRes?.data as any)?.token ||
      null;

    if (token) {
      setAdminToken(token);
      return token;
    }
  } catch (err) {
    console.warn("[adminFetch] Could not retrieve session token from auth service:", err);
  }

  return null;
}

/**
 * fetch() for /api/admin/* calls: attaches the signed-in CMS user's JWT token so the
 * server can verify who is asking (see lib/admin-auth.ts).
 */
export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAdminToken();

  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(input, { ...init, headers });

  // If unauthorized, invalidate cached token so stale credentials aren't resent indefinitely
  if (res.status === 401) {
    setAdminToken(null);
  }

  return res;
}
