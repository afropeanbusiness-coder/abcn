import { Resend } from "resend";
import nodemailer from "nodemailer";

interface EmailAttachment {
  filename: string;
  content?: string | Buffer;
  path?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  bcc?: string | string[];
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
  simulated?: boolean;
  provider?: "resend" | "smtp" | "simulated";
}

/**
 * Enterprise Email Dispatcher
 * Priority 1: Resend (RESEND_API_KEY)
 * Priority 2: Custom SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
 * Fallback: Simulation mode if no provider credentials are configured
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const from = options.from || process.env.EMAIL_FROM || "ABCN Executive Team <contact@afropeanbusiness.com>";
  const to = Array.isArray(options.to) ? options.to : [options.to];

  let resendErrorMsg: string | null = null;
  let smtpErrorMsg: string | null = null;

  // 1. Try Resend
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);

      // Attempt send with auto-retry for 429 rate limit (Resend free tier: 2 req/s)
      let attempt = 0;
      let lastErr: string | null = null;
      let sentId: string | null = null;

      while (attempt < 2 && !sentId) {
        attempt++;
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
          lastErr = res.error.message;
          console.warn(`[Email:Resend] Attempt ${attempt} failed:`, lastErr);
          // If rate limit error, pause and retry
          if (lastErr?.toLowerCase().includes("rate limit") || lastErr?.includes("429")) {
            await new Promise((r) => setTimeout(r, 650 * attempt));
            continue;
          }
          break;
        }

        if (res.data?.id) {
          sentId = res.data.id;
        }
      }

      if (sentId) {
        console.log(`[Email:Resend] Successfully delivered to ${to.join(", ")} (ID: ${sentId})`);
        return { success: true, id: sentId, provider: "resend" };
      }

      resendErrorMsg = lastErr || "Resend dispatch failed with unknown error";
    } catch (err: any) {
      resendErrorMsg = err.message || "Resend connection error";
      console.warn("[Email:Resend] Exception:", resendErrorMsg);
    }
  }

  // 2. Try SMTP (if configured, or as fallback if Resend failed)
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
        replyTo: options.replyTo || "contact@afropeanbusiness.com",
        bcc: options.bcc,
      });

      console.log(`[Email:SMTP] Successfully delivered to ${to.join(", ")} (MsgID: ${info.messageId})`);
      return { success: true, id: info.messageId, provider: "smtp" };
    } catch (err: any) {
      smtpErrorMsg = err.message || "SMTP transmission error";
      console.error("[Email:SMTP] Failed:", smtpErrorMsg);
    }
  }

  // If a live service was configured (Resend or SMTP) but failed, REPORT THE ACTUAL FAILURE
  if (process.env.RESEND_API_KEY || (process.env.SMTP_HOST && process.env.SMTP_USER)) {
    const combinedError = [
      resendErrorMsg ? `Resend: ${resendErrorMsg}` : null,
      smtpErrorMsg ? `SMTP: ${smtpErrorMsg}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    console.error(`[Email:Delivery Failure] Could not send to ${to.join(", ")}:`, combinedError);
    return {
      success: false,
      error: combinedError || "Email delivery failed across all configured providers",
    };
  }

  // 3. Fallback: Log email details cleanly in unconfigured / dev environments
  console.log("--------------------------------------------------");
  console.log(`[Email Simulation - Configure RESEND_API_KEY or SMTP_HOST to deliver live emails]`);
  console.log(`From:    ${from}`);
  console.log(`To:      ${to.join(", ")}`);
  console.log(`Subject: ${options.subject}`);
  console.log(`Time:    ${new Date().toISOString()}`);
  console.log("--------------------------------------------------");

  return { success: true, id: "simulated-" + Date.now(), simulated: true, provider: "simulated" };
}

export * from "./email-templates";
