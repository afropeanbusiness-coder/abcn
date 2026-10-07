import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { applicationState } from "@/lib/application-status";
import { checkAccessLink, claimAccessLink, releaseAccessLink } from "@/lib/access-links";
import { sendEmail, buildApplicationConfirmationHtml, buildAdminApplicationAlertHtml } from "@/lib/email";
import { getEmailSettings } from "@/lib/settings";
import {
  allFields,
  buildDefaultForm,
  cleanValue,
  isVisible,
  isFileId,
  type Answers,
  parseForm,
  pickText,
  REQUIRED_CORE,
  validateField,
  type AnswerValue,
  type ApplicationForm,
  type CoreKey,
} from "@/lib/application-form";

export const dynamic = "force-dynamic";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: NextRequest) {
  let claimedLinkId: string | undefined;
  try {
    const body = await req.json();
    const { eventId, eventSlug, consent } = body;
    const answersIn: Record<string, unknown> =
      body.answers && typeof body.answers === "object" ? body.answers : {};

    if (!consent) return fail("Consent to the privacy policy is required.");

    // Resolve the event, and with it the form this event actually uses.
    let resolvedEventId: string | null = eventId || null;
    let eventTitle = "ABCN Flagship Programme";
    let storedForm: unknown = null;
    let accessLinkId: string | undefined;
    let eventDetails: any = null;
    {
      const cols = `id, title, slug, venue, city, country, date_label, email_template, application_form, application_open, application_override, application_opens_at, application_closes_at,
                    application_max, (SELECT COUNT(*) FROM event_applications a WHERE a.event_id = events.id) AS n`;
      const rows = resolvedEventId
        ? await query<any>(`SELECT ${cols} FROM events WHERE id = $1 LIMIT 1`, [resolvedEventId])
        : await query<any>(`SELECT ${cols} FROM events WHERE slug = $1 LIMIT 1`, [eventSlug || "fiali-frankfurt-2026"]);
      if (rows.length > 0) {
        eventDetails = rows[0];
        resolvedEventId = rows[0].id;
        eventTitle = rows[0].title || eventTitle;
        storedForm = rows[0].application_form;

        // Enforced here, not just in the page: a hidden form can still be posted to.
        const state = applicationState(rows[0], { count: Number(rows[0].n) });
        let allowed = state === "open";
        if (!allowed && state !== "off" && rows[0].application_override !== "closed" && body.accessToken) {
          const link = await checkAccessLink(rows[0].id, String(body.accessToken));
          if (link.ok) {
            allowed = true;
            accessLinkId = link.id;
          }
        }
        if (!allowed) {
          const de = body.locale === "de";
          const msg: Record<string, [string, string]> = {
            off: ["Applications are not open for this programme.", "Für dieses Programm werden derzeit keine Bewerbungen angenommen."],
            closed: ["Applications for this programme have closed.", "Die Bewerbungsfrist für dieses Programm ist abgelaufen."],
            upcoming: ["Applications for this programme have not opened yet.", "Die Bewerbung für dieses Programm ist noch nicht geöffnet."],
            full: ["This programme has reached its maximum number of applications.", "Für dieses Programm wurde die maximale Anzahl an Bewerbungen erreicht."],
          };
          return NextResponse.json({ error: msg[state][de ? 1 : 0], code: `applications_${state}` }, { status: 403 });
        }
      }
    }
    const form: ApplicationForm = parseForm(storedForm) ?? buildDefaultForm(false);

    // The browser is never trusted: every field is re-validated against the
    // form as stored, and unknown properties are ignored.
    const core: Partial<Record<CoreKey, AnswerValue>> = {};
    const custom: Record<string, { label: string; value: unknown }> = {};
    const fileIds: string[] = [];

    // Answers as submitted, so conditional questions can be evaluated.
    const submitted: Answers = {};
    for (const field of allFields(form)) {
      submitted[field.id] = cleanValue(field, field.core ? body[field.core] : answersIn[field.id]);
    }

    for (const field of allFields(form)) {
      // A question hidden by its condition is neither required nor stored.
      if (!isVisible(field, submitted)) continue;
      const value = submitted[field.id];
      const err = validateField(field, value);
      if (err) {
        const name = pickText(field.label, field.label_de, "en");
        return fail(`“${name}” is ${err === "required" ? "required" : "not valid"}.`);
      }
      if (field.type === "file") {
        if (!value) continue;
        // The upload must exist, be for this event + question, and be unclaimed.
        const f = await query<{ id: string; filename: string; size: number }>(
          `SELECT id, filename, size FROM application_files
           WHERE id = $1 AND event_id IS NOT DISTINCT FROM $2 AND field_id = $3 AND application_id IS NULL`,
          [String(value), resolvedEventId, field.id]
        );
        if (!f[0] || !isFileId(String(value))) {
          return fail(`“${pickText(field.label, field.label_de, "en")}”: the uploaded file was not found. Please upload it again.`);
        }
        fileIds.push(f[0].id);
        custom[field.id] = {
          label: pickText(field.label, undefined, "en"),
          value: { fileId: f[0].id, name: f[0].filename, size: f[0].size },
        };
        continue;
      }
      if (field.core) core[field.core] = value;
      else custom[field.id] = { label: pickText(field.label, undefined, "en"), value };
    }

    // The applicant record cannot exist without these.
    for (const k of REQUIRED_CORE) {
      if (!String(core[k] ?? "").trim()) return fail("First name, last name, and a valid email are required.");
    }

    const s = (k: CoreKey) => String(core[k] ?? "").trim();
    const params = [
      resolvedEventId,
      s("firstName"),
      s("lastName"),
      s("jobTitle"),
      s("email").toLowerCase(),
      s("phone"),
      s("location") || body.city || "Frankfurt am Main",
      body.country || "DE",
      s("companyName"),
      s("companyUrl"),
      s("sector"),
      s("stage"),
      s("aiFocus"),
      s("motivation"),
      s("grantInterest"),
      String(body.referralSource || "").trim().slice(0, 300),
      true,
      Object.keys(custom).length ? JSON.stringify(custom) : null,
    ];

    // A private link is used up here, before saving, so two people cannot both
    // use its last place. It is given back below if saving fails.
    if (accessLinkId) {
      if (!(await claimAccessLink(accessLinkId))) {
        return NextResponse.json({ error: "This access link has expired or has been used up.", code: "link_exhausted" }, { status: 403 });
      }
      claimedLinkId = accessLinkId;
    }

    const result = await query<{ id: string; submitted_at: string }>(
      `INSERT INTO event_applications (
        event_id, first_name, last_name, role_title, email, phone, city, country,
        company_name, company_website, business_model, venture_stage, ai_interest,
        motivation, goals, referral_source, consent, answers, status, submitted_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'submitted', NOW()
      ) RETURNING id, submitted_at;`,
      params
    );

    // Claim the uploaded files for this application.
    if (fileIds.length) {
      await query("UPDATE application_files SET application_id = $1 WHERE id = ANY($2::uuid[])", [
        result[0].id,
        fileIds,
      ]);
    }

    // Dispatch confirmation and admin alert emails with awaited delivery & status logging
    try {
      const emailSettings = await getEmailSettings();
      const applicantEmail = s("email").toLowerCase();

      const applicantSummary = {
        applicantId: result[0].id,
        eventTitle,
        firstName: s("firstName"),
        lastName: s("lastName"),
        email: applicantEmail,
        phone: s("phone"),
        city: s("location") || body.city || "Frankfurt am Main",
        country: body.country || "DE",
        companyName: s("companyName"),
        companyWebsite: s("companyUrl"),
        roleTitle: s("jobTitle"),
        businessModel: s("sector"),
        ventureStage: s("stage"),
        aiInterest: s("aiFocus"),
        motivation: s("motivation"),
        goals: s("grantInterest"),
        customAnswers: Object.keys(custom).length ? custom : undefined,
        submittedAt: result[0].submitted_at || new Date().toISOString(),
      };

      // 1. Applicant Confirmation Dispatch
      if (emailSettings.send_to_applicant) {
        try {
          const { html: confirmationHtml, subject: emailSubject } = buildApplicationConfirmationHtml(
            applicantSummary,
            eventDetails?.email_template,
            eventDetails
          );
          const finalSubject = emailSubject || `Application Received: ${eventTitle} — ABCN`;

          const sendRes = await sendEmail({
            to: applicantEmail,
            subject: finalSubject,
            html: confirmationHtml,
          });

          const status = sendRes.success ? (sendRes.simulated ? "simulated" : "sent") : "failed";
          await query(
            `UPDATE event_applications 
             SET email_status = $1, email_sent_at = NOW(), email_error = $2 
             WHERE id = $3`,
            [status, sendRes.error || null, result[0].id]
          ).catch((e) => console.warn("[DB] Failed to update applicant email status:", e));
        } catch (appSendErr: any) {
          console.error("[Applicant Email Dispatch Failed]:", appSendErr);
          await query(
            `UPDATE event_applications 
             SET email_status = 'failed', email_error = $1 
             WHERE id = $2`,
            [appSendErr?.message || "Send failed", result[0].id]
          ).catch(() => {});
        }
      } else {
        await query(
          `UPDATE event_applications SET email_status = 'disabled' WHERE id = $1`,
          [result[0].id]
        ).catch(() => {});
      }

      // 2. Admin Alert Dispatch (separate, dedicated delivery)
      if (emailSettings.send_to_admin) {
        try {
          // Brief pause (150ms) to ensure Resend rate limit (2 req/s) is never exceeded
          if (emailSettings.send_to_applicant) {
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
          await query(
            `UPDATE event_applications 
             SET admin_alert_status = $1, admin_alert_sent_at = NOW(), admin_alert_error = $2 
             WHERE id = $3`,
            [adminStatus, adminSendRes.error || null, result[0].id]
          ).catch((e) => console.warn("[DB] Failed to update admin alert status:", e));
        } catch (adminSendErr: any) {
          console.error("[Admin Alert Dispatch Failed]:", adminSendErr);
          await query(
            `UPDATE event_applications 
             SET admin_alert_status = 'failed', admin_alert_error = $1 
             WHERE id = $2`,
            [adminSendErr?.message || "Send failed", result[0].id]
          ).catch(() => {});
        }
      } else {
        await query(
          `UPDATE event_applications SET admin_alert_status = 'disabled' WHERE id = $1`,
          [result[0].id]
        ).catch(() => {});
      }
    } catch (emailBuildErr) {
      console.error("[Application Email Orchestration Error]:", emailBuildErr);
    }

    return NextResponse.json(
      { success: true, data: result[0], message: "Application submitted successfully." },
      { status: 201 }
    );
  } catch (err: any) {
    if (claimedLinkId) await releaseAccessLink(claimedLinkId).catch(() => {});
    console.error("[POST /api/applications error]", err);
    return NextResponse.json({ error: err.message || "Failed to submit application." }, { status: 500 });
  }
}
