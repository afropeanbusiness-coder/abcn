import { Pool } from "@neondatabase/serverless";

let globalPool: Pool | null = null;

/**
 * The connection string comes from the environment only.
 *
 * This file used to carry a live production connection string - username,
 * password and host - as a fallback for when DATABASE_URL was unset. That put
 * a working credential into the git history of a repository hosted on GitHub,
 * and it meant a missing environment variable failed silently by connecting to
 * production instead of erroring. Both are worth avoiding; do not reintroduce
 * a default here.
 */
export function getDbPool(): Pool {
  if (!globalPool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set. Add it to .env.local for local development, " +
          "or to the project's environment variables in the hosting dashboard."
      );
    }

    globalPool = new Pool({ connectionString });
  }
  return globalPool;
}

export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const pool = getDbPool();
  let retries = 3;
  let delay = 300;

  while (retries > 0) {
    try {
      const res = await pool.query(text, params);
      return res.rows as T[];
    } catch (err: any) {
      retries--;
      if (retries === 0) throw err;
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }
  return [];
}
