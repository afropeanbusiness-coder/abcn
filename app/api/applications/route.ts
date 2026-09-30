import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  allFields,
  buildDefaultForm,
  cleanValue,
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
    let storedForm: unknown = null;
    {
      const rows = resolvedEventId
        ? await query<{ id: string; application_form: unknown }>(
            "SELECT id, application_form FROM events WHERE id = $1 LIMIT 1",
            [resolvedEventId]
          )
        : await query<{ id: string; application_form: unknown }>(
            "SELECT id, application_form FROM events WHERE slug = $1 LIMIT 1",
            [eventSlug || "fiali-frankfurt-2026"]
          );
      if (rows.length > 0) {
        resolvedEventId = rows[0].id;
        storedForm = rows[0].application_form;
      }
    }
    const form: ApplicationForm = parseForm(storedForm) ?? buildDefaultForm(false);

    // The browser is never trusted: every field is re-validated against the
    // form as stored, and unknown properties are ignored.
    const core: Partial<Record<CoreKey, AnswerValue>> = {};
    const custom: Record<string, { label: string; value: AnswerValue }> = {};
    for (const field of allFields(form)) {
      const raw = field.core ? body[field.core] : answersIn[field.id];
      const value = cleanValue(field, raw);
      const err = validateField(field, value);
      if (err) {
        const name = pickText(field.label, field.label_de, "en");
        return fail(`“${name}” is ${err === "required" ? "required" : "not valid"}.`);
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

    return NextResponse.json(
      { success: true, data: result[0], message: "Application submitted successfully." },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/applications error]", err);
    return NextResponse.json({ error: err.message || "Failed to submit application." }, { status: 500 });
  }
}
