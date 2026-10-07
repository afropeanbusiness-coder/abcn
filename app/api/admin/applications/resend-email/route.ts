import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { sendEmail, buildApplicationConfirmationHtml, buildAdminApplicationAlertHtml } from "@/lib/email";
import { getEmailSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/applications/resend-email
 * Retries or resends confirmation and/or admin alert emails for existing applicant records.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const { applicationId, applicationIds, sendToApplicant = true, sendToAdmin = false } = body;

    const ids: string[] = [];
    if (applicationId) ids.push(String(applicationId));
    if (Array.isArray(applicationIds)) {
      for (const id of applicationIds) {
        if (id && !ids.includes(String(id))) ids.push(String(id));
      }
    }

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "Please provide an applicationId or an array of applicationIds." },
        { status: 400 }
      );
    }

    const emailSettings = await getEmailSettings();

    // Query application records joined with their respective event details
    const applications = await query<any>(
      `SELECT a.*, e.title as event_title, e.slug as event_slug, e.venue as event_venue,
              e.city as event_city, e.country as event_country, e.date_label as event_date_label,
              e.email_template as event_email_template
       FROM event_applications a
       LEFT JOIN events e ON a.event_id = e.id
       WHERE a.id = ANY($1::uuid[])`,
      [ids]
    );

    if (applications.length === 0) {
      return NextResponse.json(
        { success: false, error: "No matching application records found." },
        { status: 404 }
      );
    }

    const results: Array<{
      id: string;
      email: string;
      name: string;
      applicantStatus?: string;
      applicantError?: string;
      adminStatus?: string;
      adminError?: string;
      isSimulated?: boolean;
    }> = [];

    for (let i = 0; i < applications.length; i++) {
      const app = applications[i];
      const eventTitle = app.event_title || "ABCN Flagship Programme";
      const applicantEmail = String(app.email || "").toLowerCase().trim();

      const eventDetails = {
        title: eventTitle,
        slug: app.event_slug || "",
        venue: app.event_venue || "Frankfurt am Main",
        city: app.event_city || "Frankfurt am Main",
        country: app.event_country || "DE",
        date_label: app.event_date_label || "Upcoming",
        email_template: app.event_email_template,
      };

      let customAnswers: any = undefined;
      try {
        if (typeof app.answers === "string") customAnswers = JSON.parse(app.answers);
        else if (typeof app.answers === "object" && app.answers !== null) customAnswers = app.answers;
      } catch {
        // Keep undefined
      }

      const applicantSummary = {
        applicantId: app.id,
        eventTitle,
        firstName: app.first_name || "",
        lastName: app.last_name || "",
        email: applicantEmail,
        phone: app.phone || "",
        city: app.city || "Frankfurt am Main",
        country: app.country || "DE",
        companyName: app.company_name || "",
        companyWebsite: app.company_website || "",
        roleTitle: app.role_title || "",
        businessModel: app.business_model || "",
        ventureStage: app.venture_stage || "",
        aiInterest: app.ai_interest || "",
        motivation: app.motivation || "",
        goals: app.goals || "",
        customAnswers,
        submittedAt: app.submitted_at ? new Date(app.submitted_at).toISOString() : new Date().toISOString(),
      };

      const recordResult: (typeof results)[0] = {
        id: app.id,
        email: applicantEmail,
        name: `${app.first_name || ""} ${app.last_name || ""}`.trim(),
      };

      // 1. Resend Applicant Confirmation
      if (sendToApplicant && applicantEmail) {
        try {
          const { html: confirmationHtml, subject: emailSubject } = buildApplicationConfirmationHtml(
            applicantSummary,
            eventDetails.email_template,
            eventDetails
          );
          const finalSubject = emailSubject || `Application Received: ${eventTitle} — ABCN`;

          const sendRes = await sendEmail({
            to: applicantEmail,
            subject: finalSubject,
            html: confirmationHtml,
          });

          const status = sendRes.success ? (sendRes.simulated ? "simulated" : "sent") : "failed";
          recordResult.applicantStatus = status;
          recordResult.applicantError = sendRes.error;
          recordResult.isSimulated = sendRes.simulated;

          await query(
            `UPDATE event_applications 
             SET email_status = $1, email_sent_at = NOW(), email_error = $2 
             WHERE id = $3`,
            [status, sendRes.error || null, app.id]
          );
        } catch (err: any) {
          recordResult.applicantStatus = "failed";
          recordResult.applicantError = err.message || "Unknown error";
          await query(
            `UPDATE event_applications SET email_status = 'failed', email_error = $1 WHERE id = $2`,
            [err.message || "Unknown error", app.id]
          );
        }
      }

      // 2. Resend Admin Alert
      if (sendToAdmin) {
        try {
          if (sendToApplicant) {
            await new Promise((r) => setTimeout(r, 150));
          }

          const { html: adminHtml, subject: adminSubject } = buildAdminApplicationAlertHtml(
            applicantSummary,
            eventDetails
          );

          const adminSendRes = await sendEmail({
            to: emailSettings.admin_email || "afropeanbusiness@gmail.com",
            subject: adminSubject,
            html: adminHtml,
          });

          const adminStatus = adminSendRes.success ? (adminSendRes.simulated ? "simulated" : "sent") : "failed";
          recordResult.adminStatus = adminStatus;
          recordResult.adminError = adminSendRes.error;

          await query(
            `UPDATE event_applications 
             SET admin_alert_status = $1, admin_alert_sent_at = NOW(), admin_alert_error = $2 
             WHERE id = $3`,
            [adminStatus, adminSendRes.error || null, app.id]
          );
        } catch (err: any) {
          recordResult.adminStatus = "failed";
          recordResult.adminError = err.message || "Unknown error";
        }
      }

      results.push(recordResult);

      // Brief delay between batch records if multiple
      if (i < applications.length - 1) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    const failedCount = results.filter((r) => r.applicantStatus === "failed" || r.adminStatus === "failed").length;

    return NextResponse.json({
      success: failedCount === 0,
      total: results.length,
      failedCount,
      results,
      message: `Processed ${results.length} email dispatch${results.length > 1 ? "es" : ""}.`,
    });
  } catch (err: any) {
    console.error("POST /api/admin/applications/resend-email error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process email resend." },
      { status: 500 }
    );
  }
}
