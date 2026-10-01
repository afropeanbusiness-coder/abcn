import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { sendEmail, buildApplicationConfirmationHtml } from "@/lib/email";
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
    {
      const rows = resolvedEventId
        ? await query<{ id: string; title: string; application_form: unknown }>(
            "SELECT id, title, application_form FROM events WHERE id = $1 LIMIT 1",
            [resolvedEventId]
          )
        : await query<{ id: string; title: string; application_form: unknown }>(
            "SELECT id, title, application_form FROM events WHERE slug = $1 LIMIT 1",
            [eventSlug || "fiali-frankfurt-2026"]
          );
      if (rows.length > 0) {
        resolvedEventId = rows[0].id;
        eventTitle = rows[0].title || eventTitle;
        storedForm = rows[0].application_form;
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

    // Dispatch confirmation emails according to active notification preferences
    try {
      const emailSettings = await getEmailSettings();
      const applicantEmail = s("email").toLowerCase();

      if (emailSettings.send_to_applicant || emailSettings.send_to_admin) {
        const confirmationHtml = buildApplicationConfirmationHtml({
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
        });

        if (emailSettings.send_to_applicant) {
          // Send to applicant, with BCC to admin if admin alerts are enabled
          sendEmail({
            to: applicantEmail,
            subject: `Application Received: ${eventTitle} — ABCN`,
            html: confirmationHtml,
            bcc: emailSettings.send_to_admin ? emailSettings.admin_email : undefined,
          }).catch((emailErr) => {
            console.error("[Application Confirmation Email Failed]:", emailErr);
          });
        } else if (emailSettings.send_to_admin) {
          // Applicant emails are deactivated; send alert only to admin
          sendEmail({
            to: emailSettings.admin_email,
            subject: `[Admin Alert] Application Received: ${eventTitle} — ABCN`,
            html: confirmationHtml,
          }).catch((emailErr) => {
            console.error("[Admin Alert Email Failed]:", emailErr);
          });
        }
      }
    } catch (emailBuildErr) {
      console.error("[Application Email Dispatch Error]:", emailBuildErr);
    }

    return NextResponse.json(
      { success: true, data: result[0], message: "Application submitted successfully." },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/applications error]", err);
    return NextResponse.json({ error: err.message || "Failed to submit application." }, { status: 500 });
  }
}
