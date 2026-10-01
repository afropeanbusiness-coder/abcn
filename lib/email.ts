import { Resend } from "resend";
import nodemailer from "nodemailer";

interface EmailAttachment {
  filename: string;
  content?: string | Buffer;
  path?: string;
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  bcc?: string | string[];
  attachments?: EmailAttachment[];
}

/**
 * Enterprise Email Dispatcher
 * Priority 1: Resend (RESEND_API_KEY)
 * Priority 2: Custom SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
 * Fallback: Console logger in dev/staging if credentials are not configured yet
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  const from = options.from || process.env.EMAIL_FROM || "ABCN Executive Team <contact@afropeanbusiness.com>";
  const to = Array.isArray(options.to) ? options.to : [options.to];

  // 1. Try Resend
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const res = await resend.emails.send({
        from,
        to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo || "contact@afropeanbusiness.com",
        bcc: options.bcc,
      });

      if (res.error) {
        console.error("[Email:Resend] API Error:", res.error);
        throw new Error(res.error.message);
      }

      console.log(`[Email:Resend] Email sent to ${to.join(", ")} (ID: ${res.data?.id})`);
      return { success: true, id: res.data?.id };
    } catch (err: any) {
      console.warn("[Email:Resend] Failed to send via Resend, checking SMTP fallback...", err.message);
    }
  }

  // 2. Try SMTP
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD,
        },
      });

      const info = await transporter.sendMail({
        from,
        to: to.join(", "),
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        bcc: options.bcc,
      });

      console.log(`[Email:SMTP] Email sent to ${to.join(", ")} (MsgID: ${info.messageId})`);
      return { success: true, id: info.messageId };
    } catch (err: any) {
      console.error("[Email:SMTP] Failed to send via SMTP:", err.message);
      return { success: false, error: err.message };
    }
  }

  // 3. Fallback: Log email details cleanly
  console.log("--------------------------------------------------");
  console.log(`[Email Simulation - Configure RESEND_API_KEY or SMTP_HOST to deliver live emails]`);
  console.log(`From:    ${from}`);
  console.log(`To:      ${to.join(", ")}`);
  console.log(`Subject: ${options.subject}`);
  console.log(`Time:    ${new Date().toISOString()}`);
  console.log("--------------------------------------------------");

  return { success: true, id: "simulated-" + Date.now() };
}

export interface ApplicationEmailSummary {
  applicantId: string;
  eventTitle: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  city?: string;
  country?: string;
  companyName?: string;
  companyWebsite?: string;
  roleTitle?: string;
  businessModel?: string;
  ventureStage?: string;
  aiInterest?: string;
  motivation?: string;
  goals?: string;
  customAnswers?: Record<string, { label: string; value: any }>;
  submittedAt: string;
}

/**
 * Builds an authentic, executive ABCN-branded confirmation email template
 */
export function buildApplicationConfirmationHtml(data: ApplicationEmailSummary): string {
  const logoUrl = "https://www.afropeanbusiness.com/assets/abcn/abcn-logo.png";
  const dateFormatted = new Date(data.submittedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const renderRow = (label: string, value: string | undefined | null) => {
    if (!value || !String(value).trim()) return "";
    return `
      <tr>
        <td style="padding: 10px 14px; font-size: 13px; font-weight: 600; color: #4b5563; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; width: 34%; vertical-align: top;">
          ${label}
        </td>
        <td style="padding: 10px 14px; font-size: 13.5px; color: #0f172a; border-bottom: 1px solid #e2e8f0; vertical-align: top; word-break: break-word;">
          ${escapeHtml(String(value))}
        </td>
      </tr>
    `;
  };

  const customRows = data.customAnswers
    ? Object.entries(data.customAnswers)
        .map(([_, item]) => {
          let val = item.value;
          if (val && typeof val === "object" && val.name) {
            val = `Attached file: ${val.name}`;
          }
          return renderRow(item.label, String(val || ""));
        })
        .join("")
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Received — ABCN</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="100%" max-width="640" cellpadding="0" cellspacing="0" border="0" style="max-width: 640px; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
          
          <!-- Top Header Strip -->
          <tr>
            <td style="background-color: #071b33; padding: 28px 32px; text-align: center; border-bottom: 3px solid #E09000;">
              <img src="${logoUrl}" alt="ABCN - Afropean Business & Culture Network" width="180" style="height: auto; max-width: 200px; display: block; margin: 0 auto;" />
              <div style="color: #94a3b8; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; margin-top: 12px;">
                Executive Program Application
              </div>
            </td>
          </tr>

          <!-- Welcome Banner -->
          <tr>
            <td style="padding: 32px 32px 20px 32px;">
              <div style="display: inline-block; background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; margin-bottom: 16px;">
                ✓ Application Received & Logged
              </div>
              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.3;">
                Thank you for applying, ${escapeHtml(data.firstName)}!
              </h1>
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #475569; line-height: 1.6;">
                We have successfully received your candidate submission for <strong>${escapeHtml(data.eventTitle)}</strong>. Our evaluation committee has logged your profile and will review your venture dossier.
              </p>
              <div style="padding: 12px 16px; background-color: #f8fafc; border-left: 4px solid #E09000; border-radius: 4px; font-size: 13px; color: #334155;">
                <strong>Candidate Reference ID:</strong> <code style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${data.applicantId.slice(0, 8)}</code> &nbsp;·&nbsp; <strong>Date:</strong> ${dateFormatted}
              </div>
            </td>
          </tr>

          <!-- Summary Header -->
          <tr>
            <td style="padding: 10px 32px 10px 32px;">
              <h2 style="margin: 0; font-size: 15px; font-weight: 700; color: #071b33; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
                Submission Summary
              </h2>
            </td>
          </tr>

          <!-- Summary Table -->
          <tr>
            <td style="padding: 8px 32px 24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                ${renderRow("Full Name", `${data.firstName} ${data.lastName}`)}
                ${renderRow("Email Address", data.email)}
                ${renderRow("Phone Number", data.phone)}
                ${renderRow("City / Country", [data.city, data.country].filter(Boolean).join(", "))}
                ${renderRow("Venture / Company", data.companyName)}
                ${renderRow("Role in Venture", data.roleTitle)}
                ${renderRow("Website / URL", data.companyWebsite)}
                ${renderRow("Industry / Model", data.businessModel)}
                ${renderRow("Venture Stage", data.ventureStage)}
                ${renderRow("AI & Digital Focus", data.aiInterest)}
                ${renderRow("Founder Motivation", data.motivation)}
                ${renderRow("Venture Goals / Grant Focus", data.goals)}
                ${customRows}
              </table>
            </td>
          </tr>

          <!-- What's Next Card -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 20px;">
                <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: #071b33;">
                  What Happens Next?
                </h3>
                <ul style="margin: 0; padding-left: 20px; font-size: 13.5px; color: #475569; line-height: 1.6;">
                  <li style="margin-bottom: 6px;"><strong>Admissions Review:</strong> Each venture dossier is screened individually by our selection team.</li>
                  <li style="margin-bottom: 6px;"><strong>Cohort Notification:</strong> Selected founders will receive an official invitation letter and onboarding schedule via email.</li>
                  <li><strong>Questions or updates?</strong> If you have pitch decks or updates to attach, reply directly to this email or reach us at <a href="mailto:contact@afropeanbusiness.com" style="color: #071b33; font-weight: 600; text-decoration: underline;">contact@afropeanbusiness.com</a>.</li>
                </ul>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #071b33; padding: 24px 32px; text-align: center; color: #94a3b8; font-size: 12px; line-height: 1.5; border-top: 1px solid #1e293b;">
              <div style="font-weight: 700; color: #ffffff; margin-bottom: 4px;">Afropean Business & Culture Network (ABCN)</div>
              <div>Frankfurt am Main · Germany</div>
              <div style="margin-top: 12px; font-size: 11px;">
                <a href="https://www.afropeanbusiness.com" style="color: #E09000; text-decoration: none; margin: 0 8px;">Home</a> ·
                <a href="https://www.afropeanbusiness.com/events" style="color: #E09000; text-decoration: none; margin: 0 8px;">Events</a> ·
                <a href="https://www.afropeanbusiness.com/privacy" style="color: #94a3b8; text-decoration: none; margin: 0 8px;">Privacy</a> ·
                <a href="https://www.afropeanbusiness.com/impressum" style="color: #94a3b8; text-decoration: none; margin: 0 8px;">Impressum</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Builds an invitation email template for new administrators
 */
export function buildAdminInviteHtml(data: { name: string; email: string; tempPassword: string; invitedBy: string }): string {
  const logoUrl = "https://www.afropeanbusiness.com/assets/abcn/abcn-logo.png";
  const loginUrl = "https://www.afropeanbusiness.com/admin/events";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Admin Invitation — ABCN Portal</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="560" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 8px 20px rgba(0,0,0,0.05);">
          <tr>
            <td style="background-color: #071b33; padding: 24px; text-align: center; border-bottom: 3px solid #E09000;">
              <img src="${logoUrl}" alt="ABCN" width="160" style="display: block; margin: 0 auto;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px 0; color: #071b33; font-size: 20px;">Administrator Access Granted</h2>
              <p style="color: #475569; font-size: 14.5px; line-height: 1.6; margin: 0 0 20px 0;">
                Hello <strong>${escapeHtml(data.name)}</strong>,<br>
                You have been invited by <strong>${escapeHtml(data.invitedBy)}</strong> to access the ABCN Executive Portal to manage programmes, applicants, and partners.
              </p>
              
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
                <div style="font-size: 13px; color: #64748b; margin-bottom: 6px;">Portal Sign-In Credentials:</div>
                <div style="font-size: 14px; color: #0f172a; margin-bottom: 4px;"><strong>Email:</strong> ${escapeHtml(data.email)}</div>
                <div style="font-size: 14px; color: #0f172a;"><strong>Temporary Password:</strong> <code style="font-family: monospace; background: #e2e8f0; padding: 3px 6px; border-radius: 4px; font-weight: bold;">${escapeHtml(data.tempPassword)}</code></div>
              </div>

              <div style="text-align: center; margin: 28px 0;">
                <a href="${loginUrl}" style="background-color: #071b33; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
                  Access Executive Portal →
                </a>
              </div>

              <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0;">
                For security, please keep your credentials confidential. If you did not expect this invitation, please contact contact@afropeanbusiness.com.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
