import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  sendEmail,
  renderCustomEmailHtml,
  EmailTemplateConfig,
  ApplicationEmailSummary,
  DEFAULT_EMAIL_TEMPLATES,
} from "@/lib/email";
import { getEmailSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/email-templates/test
 * Dispatches an authentic test email to verify layout and delivery.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const emailSettings = await getEmailSettings();
    const targetEmail = String(body.targetEmail || emailSettings.admin_email || "afropeanbusiness@gmail.com").trim();

    if (!targetEmail || !targetEmail.includes("@")) {
      return NextResponse.json({ success: false, error: "A valid recipient email address is required." }, { status: 400 });
    }

    const templateConfig: Partial<EmailTemplateConfig> = body.template || DEFAULT_EMAIL_TEMPLATES[0];

    const sampleSummary: ApplicationEmailSummary = {
      applicantId: "DEMO-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      eventTitle: body.eventTitle || "Frankfurt International African Leadership & Innovation Summit",
      firstName: "Jane",
      lastName: "Doe",
      email: targetEmail,
      phone: "+49 152 0000 0000",
      city: "Frankfurt am Main",
      country: "DE",
      companyName: "AfroTech Digital Ventures",
      companyWebsite: "https://afrotechventures.com",
      roleTitle: "Co-Founder & CEO",
      businessModel: "B2B SaaS / Cross-Border FinTech",
      ventureStage: "Growth & Series A Prep",
      aiInterest: "Generative Workflows, Machine Learning & Predictive Risk Scoring",
      motivation: "Scaling European-African commercial bridges and raising strategic co-investment.",
      goals: "Connecting with institutional European LPs, enterprise channel partners and growth capital.",
      customAnswers: {
        deck: { label: "Pitch Deck Attachment", value: { name: "AfroTech_Executive_Deck_2026.pdf" } },
        team_size: { label: "Full-Time Team Size", value: "18 FTE" },
      },
      submittedAt: new Date().toISOString(),
    };

    const sampleEventDetails = {
      title: sampleSummary.eventTitle,
      slug: body.eventSlug || "fiali-frankfurt-2026",
      venue: "Grand Ballroom, Frankfurt Marriott Hotel",
      city: "Frankfurt am Main",
      country: "Germany",
      date_label: "October 2026",
    };

    const { html, subject } = renderCustomEmailHtml(templateConfig, sampleSummary, sampleEventDetails);

    const testSubject = `[Test Preview] ${subject}`;

    const res = await sendEmail({
      to: targetEmail,
      subject: testSubject,
      html,
    });

    const isSimulated = res.id?.startsWith("simulated-");

    if (res.error) {
      return NextResponse.json({
        success: false,
        error: `Delivery Failed: ${res.error}`,
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      message: isSimulated
        ? `Test generated in Simulation Mode (RESEND_API_KEY not configured yet). Logged to server console.`
        : `Live test email successfully dispatched to ${targetEmail} via Resend / SMTP!`,
      isSimulated,
      id: res.id,
      evaluatedSubject: testSubject,
    });
  } catch (err: any) {
    console.error("POST /api/admin/email-templates/test error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to dispatch test email." }, { status: 500 });
  }
}
