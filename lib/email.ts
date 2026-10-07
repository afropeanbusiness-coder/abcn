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

export * from "./email-templates";

