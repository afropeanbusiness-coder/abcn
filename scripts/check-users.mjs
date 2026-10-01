import { Client } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

async function check() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const users = await client.query('SELECT id, name, email, role, "createdAt" FROM neon_auth."user" ORDER BY "createdAt" DESC LIMIT 10;');
    console.log("Users in neon_auth.user:", users.rows);
  } catch (err) {
    console.log("Error querying neon_auth.user:", err.message);
  }

  try {
    const accounts = await client.query('SELECT id, "userId", "accountId", "providerId", substring(password from 1 for 15) as prefix, length(password) as len FROM neon_auth."account" LIMIT 10;');
    console.log("Accounts in neon_auth.account:", accounts.rows);
  } catch (err) {
    console.log("Error querying neon_auth.account:", err.message);
  }

  await client.end();
}

check().catch(console.error);
