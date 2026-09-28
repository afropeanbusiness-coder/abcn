import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let {
      eventId,
      eventSlug,
      firstName,
      lastName,
      jobTitle,
      email,
      phone,
      location,
      city,
      country,
      companyName,
      companyUrl,
      sector,
      stage,
      aiFocus,
      motivation,
      grantInterest,
      referralSource,
      consent,
    } = body;

    // Validate required fields
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "First name, last name, and a valid email are required." },
        { status: 400 }
      );
    }

    if (!consent) {
      return NextResponse.json(
        { error: "Consent to the privacy policy is required." },
        { status: 400 }
      );
    }

    // Resolve event_id if missing or slug given
    let resolvedEventId = eventId;
    if (!resolvedEventId) {
      const slugToFind = eventSlug || "fiali-frankfurt-2026";
      const eventRows = await query<{ id: string }>(
        "SELECT id FROM events WHERE slug = $1 LIMIT 1",
        [slugToFind]
      );
      if (eventRows.length > 0) {
        resolvedEventId = eventRows[0].id;
      }
    }

    // Normalize location / city / country
    const finalCity = location || city || "Frankfurt am Main";
    const finalCountry = country || "DE";

    const insertSql = `
      INSERT INTO event_applications (
        event_id,
        first_name,
        last_name,
        role_title,
        email,
        phone,
        city,
        country,
        company_name,
        company_website,
        business_model,
        venture_stage,
        ai_interest,
        motivation,
        goals,
        referral_source,
        consent,
        status,
        submitted_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'submitted', NOW()
      )
      RETURNING id, submitted_at;
    `;

    const params = [
      resolvedEventId || null,
      firstName.trim(),
      lastName.trim(),
      (jobTitle || "").trim(),
      email.trim().toLowerCase(),
      (phone || "").trim(),
      finalCity,
      finalCountry,
      (companyName || "").trim(),
      (companyUrl || "").trim(),
      (sector || "").trim(),
      (stage || "").trim(),
      (aiFocus || "").trim(),
      (motivation || "").trim(),
      (grantInterest || "").trim(),
      (referralSource || "").trim(),
      Boolean(consent),
    ];

    const result = await query<{ id: string; submitted_at: string }>(insertSql, params);

    return NextResponse.json(
      {
        success: true,
        data: result[0],
        message: "Application submitted successfully.",
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/applications error]", err);
    return NextResponse.json(
      { error: err.message || "Failed to submit application." },
      { status: 500 }
    );
  }
}
