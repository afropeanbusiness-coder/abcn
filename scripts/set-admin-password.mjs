import { Client } from "@neondatabase/serverless";
import { hashPassword } from "@better-auth/utils/password";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("Please provide DATABASE_URL in .env.local");
  process.exit(1);
}

const targetEmail = process.argv[2] || "afropeanbusiness@gmail.com";
const newPassword = process.argv[3];

if (!newPassword) {
  console.log(`Usage: node --env-file=.env.local scripts/set-admin-password.mjs <email> <password>`);
  console.log(`Example: node --env-file=.env.local scripts/set-admin-password.mjs afropeanbusiness@gmail.com MySecurePassword123!`);
  process.exit(1);
}

async function run() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log(`Looking up user "${targetEmail}"...`);
  const userRes = await client.query('SELECT id, email, role FROM neon_auth."user" WHERE email = $1;', [targetEmail]);

  const hashedPassword = await hashPassword(newPassword);

  if (userRes.rows.length === 0) {
    console.log(`User "${targetEmail}" does not exist. Creating new admin user...`);
    const newUserId = (await client.query('SELECT gen_random_uuid() as id;')).rows[0].id;
    const now = new Date();

    await client.query(
      `INSERT INTO neon_auth."user" (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, true, 'admin', $4, $4);`,
      [newUserId, "ABCN Administrator", targetEmail, now]
    );

    const newAccountId = (await client.query('SELECT gen_random_uuid() as id;')).rows[0].id;
    await client.query(
      `INSERT INTO neon_auth."account" (id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt")
       VALUES ($1, $2, $2, 'credential', $3, $4, $4);`,
      [newAccountId, newUserId, hashedPassword, now]
    );

    console.log(`Successfully created new admin user "${targetEmail}" with specified password!`);
  } else {
    const userId = userRes.rows[0].id;
    console.log(`User found (ID: ${userId}). Updating password and ensuring admin role...`);

    await client.query(
      `UPDATE neon_auth."account" 
       SET password = $1, "updatedAt" = NOW() 
       WHERE "userId" = $2 AND "providerId" = 'credential';`,
      [hashedPassword, userId]
    );

    await client.query(
      `UPDATE neon_auth."user" 
       SET role = 'admin', "updatedAt" = NOW() 
       WHERE id = $1;`,
      [userId]
    );

    console.log(`Successfully updated password for "${targetEmail}"! You can now sign in.`);
  }

  await client.end();
}

run().catch((err) => {
  console.error("Error setting password:", err);
  process.exit(1);
});
