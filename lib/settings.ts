import { query } from "@/lib/db";

export interface EmailSettings {
  send_to_applicant: boolean;
  send_to_admin: boolean;
  admin_email: string;
}

const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  send_to_applicant: true,
  send_to_admin: true,
  admin_email: "afropeanbusiness@gmail.com",
};

/**
 * Retrieves the current email dispatch settings.
 * Checks system_settings table first, falls back to environment variables.
 */
export async function getEmailSettings(): Promise<EmailSettings> {
  try {
    const rows = await query<{ value: EmailSettings }>(
      `SELECT value FROM system_settings WHERE key = 'email_notifications' LIMIT 1;`
    );
    if (rows.length > 0 && rows[0].value) {
      const val = rows[0].value;
      return {
        send_to_applicant: val.send_to_applicant !== false,
        send_to_admin: val.send_to_admin !== false,
        admin_email: val.admin_email || process.env.ADMIN_NOTIFY_EMAIL || DEFAULT_EMAIL_SETTINGS.admin_email,
      };
    }
  } catch (err: any) {
    console.warn("[getEmailSettings] Fallback to defaults / env:", err?.message);
  }

  // Fallback to environment variables
  const envApplicant = process.env.ENABLE_APPLICANT_EMAILS;
  const envAdmin = process.env.ENABLE_ADMIN_EMAILS;

  return {
    send_to_applicant:
      envApplicant !== undefined
        ? envApplicant === "true" || envApplicant === "1"
        : DEFAULT_EMAIL_SETTINGS.send_to_applicant,
    send_to_admin:
      envAdmin !== undefined
        ? envAdmin === "true" || envAdmin === "1"
        : DEFAULT_EMAIL_SETTINGS.send_to_admin,
    admin_email: process.env.ADMIN_NOTIFY_EMAIL || DEFAULT_EMAIL_SETTINGS.admin_email,
  };
}

/**
 * Updates the email dispatch settings in PostgreSQL.
 */
export async function updateEmailSettings(settings: Partial<EmailSettings>): Promise<EmailSettings> {
  const current = await getEmailSettings();
  const updated: EmailSettings = {
    send_to_applicant:
      typeof settings.send_to_applicant === "boolean" ? settings.send_to_applicant : current.send_to_applicant,
    send_to_admin:
      typeof settings.send_to_admin === "boolean" ? settings.send_to_admin : current.send_to_admin,
    admin_email: (settings.admin_email || current.admin_email).trim(),
  };

  await query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key VARCHAR(100) PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  await query(
    `INSERT INTO system_settings (key, value, updated_at)
     VALUES ('email_notifications', $1, NOW())
     ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value, updated_at = NOW();`,
    [JSON.stringify(updated)]
  );

  return updated;
}
