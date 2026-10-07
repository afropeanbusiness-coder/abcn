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

export interface EmailTemplateConfig {
  id?: string;
  name?: string;
  category?: string;
  description?: string;
  subject: string;
  eyebrow?: string;
  headline: string;
  body: string;
  header_image_url?: string;
  show_reference_id?: boolean;
  show_summary_table?: boolean;
  next_steps_title?: string;
  next_steps_items?: string[];
  cta_text?: string;
  cta_url?: string;
  footer_note?: string;
  is_default?: boolean;
}

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplateConfig[] = [
  {
    id: "standard-confirmation",
    name: "Standard Application Confirmation",
    category: "Core",
    description: "Executive confirmation with applicant reference ID, candidate greeting, complete submission summary table, and next-steps roadmap.",
    subject: "Application Received: {{event_title}} — ABCN",
    eyebrow: "Executive Program Application",
    headline: "Thank you for applying, {{first_name}}!",
    body: "We have successfully received your candidate submission for <strong>{{event_title}}</strong>. Our evaluation committee has logged your profile and will review your venture dossier.",
    header_image_url: "https://www.afropeanbusiness.com/assets/abcn/events/rooftop-community-gathering.jpg",
    show_reference_id: true,
    show_summary_table: true,
    next_steps_title: "What Happens Next?",
    next_steps_items: [
      "Admissions Review: Each venture dossier is screened individually by our selection team.",
      "Cohort Notification: Selected founders will receive an official invitation letter and onboarding schedule via email.",
      "Questions or updates? If you have pitch decks or updates to attach, reply directly to this email or reach us at contact@afropeanbusiness.com."
    ],
    cta_text: "View Event Details",
    cta_url: "https://www.afropeanbusiness.com/events/{{event_slug}}",
    footer_note: "Afropean Business & Culture Network (ABCN) · Connecting Afropean founders, innovators & capital.",
    is_default: true
  },
  {
    id: "executive-summit-vip",
    name: "Executive Summit & VIP Invitation",
    category: "VIP / Summit",
    description: "Prestigious, high-touch confirmation designed for C-level keynotes, investor roundtables, and VIP salons.",
    subject: "VIP Registration Confirmed: {{event_title}} — ABCN Executive Suite",
    eyebrow: "Executive Suite & Private Salon",
    headline: "Welcome to the Executive Circle, {{first_name}}",
    body: "Your executive credentials for <strong>{{event_title}}</strong> at {{venue}} have been reserved. As an executive delegate representing <strong>{{company_name}}</strong>, you will have access to the priority lounge, closed-door strategic panels, and bilateral investor networking.",
    header_image_url: "https://www.afropeanbusiness.com/assets/abcn/events/fireside-stage-keynote.jpg",
    show_reference_id: true,
    show_summary_table: true,
    next_steps_title: "Executive Logistics & Protocol",
    next_steps_items: [
      "Arrival & Check-in: Please present your Reference ID ({{application_id}}) at the VIP concierge desk upon arrival.",
      "Executive Briefing: A curated briefing dossier with attendee profiles and discussion prompts will be emailed 48 hours prior.",
      "Dress Advisory: Business formal or elevated smart casual.",
      "Bilateral Introductions: If there are specific industry partners or investors in attendance you wish to meet, contact our executive liaison team."
    ],
    cta_text: "Access Executive Portal",
    cta_url: "https://www.afropeanbusiness.com/events/{{event_slug}}",
    footer_note: "ABCN Executive Directorate · Frankfurt am Main · contact@afropeanbusiness.com",
    is_default: false
  },
  {
    id: "workshop-strategy-lab",
    name: "Workshop & Strategy Lab Masterclass",
    category: "Masterclass",
    description: "Action-oriented briefing for interactive masterclasses, strategy sprints, and sales/AI labs with preparation checklist.",
    subject: "Seat Reserved: {{event_title}} — Workshop Briefing & Prep",
    eyebrow: "Hands-On Strategy Sprint",
    headline: "Get Ready for {{event_title}}, {{first_name}}!",
    body: "Your participation in <strong>{{event_title}}</strong> is confirmed. This intensive strategy lab is designed to give {{company_name}} immediately actionable frameworks, revenue systems, and peer-reviewed strategy.",
    header_image_url: "https://www.afropeanbusiness.com/assets/abcn/events/salon-conversation-circle.jpg",
    show_reference_id: true,
    show_summary_table: true,
    next_steps_title: "Preparation Checklist",
    next_steps_items: [
      "Hardware: Please bring a fully charged laptop with Wi-Fi access for live exercises.",
      "Pre-Session Case Study: Review the materials we share 3 days prior to hit the ground running.",
      "Promptness: Doors open 30 minutes before kick-off for coffee and informal peer intros.",
      "Interactive Pitching: Be prepared for lightning 2-minute strategy feedback sessions."
    ],
    cta_text: "View Workshop Syllabus",
    cta_url: "https://www.afropeanbusiness.com/events/{{event_slug}}",
    footer_note: "ABCN Academy & Venture Labs · contact@afropeanbusiness.com",
    is_default: false
  },
  {
    id: "selective-review-waitlist",
    name: "Selective Review & Jury Evaluation",
    category: "Grants / Cohorts",
    description: "Formal admissions review notification for selective venture grants, accelerator cohorts, and pitch competitions.",
    subject: "Dossier Under Review: {{event_title}} — ABCN Admissions",
    eyebrow: "Admissions & Jury Screening",
    headline: "Application Dossier Received, {{first_name}}",
    body: "Thank you for submitting your venture dossier for <strong>{{event_title}}</strong>. Due to limited cohort capacity and high candidate interest, each submission undergoes a multi-stage review process by the ABCN selection committee.",
    header_image_url: "https://www.afropeanbusiness.com/assets/abcn/events/conference-audience-hall.jpg",
    show_reference_id: true,
    show_summary_table: true,
    next_steps_title: "Selection Process & Timeline",
    next_steps_items: [
      "Stage 1: Eligibility and business model completeness check (currently underway).",
      "Stage 2: Independent scoring by industry evaluators and venture partners.",
      "Decision Release: All applicants will receive final notification by email at least two weeks before the event.",
      "Supplementary Deck: If you have updated traction metrics or pitch decks to include, reply directly to this confirmation."
    ],
    cta_text: "Track Application Status",
    cta_url: "https://www.afropeanbusiness.com",
    footer_note: "ABCN Admissions Committee · contact@afropeanbusiness.com",
    is_default: false
  },
  {
    id: "community-mixer-reception",
    name: "Community Mixer & Networking Reception",
    category: "Community",
    description: "Warm, energetic invitation for evening mixers, rooftop gatherings, and alumni community meetups.",
    subject: "You're on the Guest List: {{event_title}} — ABCN Community",
    eyebrow: "Community Gathering",
    headline: "We Can't Wait to See You, {{first_name}}!",
    body: "You are officially on the guest list for <strong>{{event_title}}</strong> in {{city}}! Get ready for an evening of authentic connections, cross-border business collaborations, and great conversations with fellow founders.",
    header_image_url: "https://www.afropeanbusiness.com/assets/abcn/events/rooftop-terrace-group.jpg",
    show_reference_id: true,
    show_summary_table: false,
    next_steps_title: "Event Day Guide",
    next_steps_items: [
      "Location & Arrival: Meet us at {{venue}} in {{city}}. Check-in opens at the entrance.",
      "Network & Exchange: Bring your business cards or digital profile to connect with 60+ founders and leaders.",
      "Dress Code: Smart casual & relaxed atmosphere.",
      "Questions? Reach out to us on Instagram @afropeanbusinessnetwork or reply to this email."
    ],
    cta_text: "Add to Calendar",
    cta_url: "https://www.afropeanbusiness.com/events/{{event_slug}}",
    footer_note: "Afropean Business & Culture Network · Together We Grow",
    is_default: false
  }
];

export function replaceEmailVariables(
  text: string,
  vars: Record<string, string | number | undefined | null>
): string {
  if (!text) return "";
  let res = text;
  for (const [key, val] of Object.entries(vars)) {
    const reg = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
    res = res.replace(reg, val !== undefined && val !== null ? String(val) : "");
  }
  return res;
}

/**
 * Builds an authentic, executive ABCN-branded email with full template customization
 */
export function renderCustomEmailHtml(
  config: Partial<EmailTemplateConfig>,
  data: ApplicationEmailSummary,
  eventDetails?: any
): { html: string; subject: string } {
  const merged: EmailTemplateConfig = {
    ...DEFAULT_EMAIL_TEMPLATES[0],
    ...config,
  };

  const logoUrl = "https://www.afropeanbusiness.com/assets/abcn/abcn-logo.png";
  const dateFormatted = data.submittedAt
    ? new Date(data.submittedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  const vars: Record<string, string> = {
    first_name: data.firstName || "Founder",
    last_name: data.lastName || "",
    full_name: `${data.firstName || ""} ${data.lastName || ""}`.trim() || "Founder",
    email: data.email || "",
    phone: data.phone || "",
    city: data.city || eventDetails?.city || "Frankfurt am Main",
    country: data.country || eventDetails?.country || "DE",
    company_name: data.companyName || "Your Venture",
    role_title: data.roleTitle || "Founder",
    event_title: data.eventTitle || eventDetails?.title || "ABCN Event",
    event_slug: eventDetails?.slug || "",
    venue: eventDetails?.venue || "Frankfurt am Main",
    date_label: eventDetails?.date_label || "Upcoming",
    application_id: data.applicantId ? data.applicantId.slice(0, 8).toUpperCase() : "ABCN-APP",
    submitted_at: dateFormatted,
  };

  const evaluatedSubject = replaceEmailVariables(merged.subject, vars);
  const evaluatedEyebrow = replaceEmailVariables(merged.eyebrow || "Executive Program Application", vars);
  const evaluatedHeadline = replaceEmailVariables(merged.headline, vars);
  const evaluatedBody = replaceEmailVariables(merged.body, vars);
  const evaluatedNextStepsTitle = replaceEmailVariables(merged.next_steps_title || "What Happens Next?", vars);
  const evaluatedCtaText = merged.cta_text ? replaceEmailVariables(merged.cta_text, vars) : "";
  const evaluatedCtaUrl = merged.cta_url ? replaceEmailVariables(merged.cta_url, vars) : "";
  const evaluatedFooterNote = replaceEmailVariables(
    merged.footer_note || "Afropean Business & Culture Network (ABCN) · Connecting Afropean founders, innovators & capital.",
    vars
  );

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

  // Render Next Steps Items
  const nextStepsHtml = Array.isArray(merged.next_steps_items) && merged.next_steps_items.length > 0
    ? `
      <tr>
        <td style="padding: 0 32px 28px 32px;">
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 20px;">
            <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: #071b33; display: flex; align-items: center; gap: 8px;">
              <span>📌</span> ${escapeHtml(evaluatedNextStepsTitle)}
            </h3>
            <ul style="margin: 0; padding-left: 20px; font-size: 13.5px; color: #475569; line-height: 1.6;">
              ${merged.next_steps_items
                .map((item) => {
                  const evaluatedItem = replaceEmailVariables(item, vars);
                  return `<li style="margin-bottom: 6px;">${evaluatedItem}</li>`;
                })
                .join("")}
            </ul>
          </div>
        </td>
      </tr>
    `
    : "";

  // Render CTA Button
  const ctaHtml = evaluatedCtaText && evaluatedCtaUrl
    ? `
      <tr>
        <td style="padding: 0 32px 28px 32px; text-align: center;">
          <a href="${evaluatedCtaUrl}" style="background-color: #071b33; color: #ffffff; text-decoration: none; padding: 13px 30px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block; border-bottom: 2px solid #E09000; box-shadow: 0 4px 12px rgba(7,27,51,0.15);">
            ${escapeHtml(evaluatedCtaText)} →
          </a>
        </td>
      </tr>
    `
    : "";

  // Header Banner Image
  const bannerImageHtml = merged.header_image_url
    ? `
      <tr>
        <td style="padding: 0; line-height: 0; background-color: #040e1b;">
          <img src="${merged.header_image_url}" alt="${escapeHtml(evaluatedHeadline)}" width="640" style="width: 100%; max-width: 640px; height: auto; max-height: 240px; object-fit: cover; display: block;" />
        </td>
      </tr>
    `
    : "";

  // Summary Table HTML
  const summaryTableHtml = merged.show_summary_table !== false
    ? `
      <!-- Summary Header -->
      <tr>
        <td style="padding: 10px 32px 10px 32px;">
          <h2 style="margin: 0; font-size: 14px; font-weight: 700; color: #071b33; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
            Submission Dossier Summary
          </h2>
        </td>
      </tr>
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
    `
    : "";

  // Reference ID Pill
  const referenceIdHtml = merged.show_reference_id !== false
    ? `
      <div style="padding: 12px 16px; background-color: #f8fafc; border-left: 4px solid #E09000; border-radius: 4px; font-size: 13px; color: #334155; margin-top: 16px;">
        <strong>Candidate Reference ID:</strong> <code style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${vars.application_id}</code> &nbsp;·&nbsp; <strong>Date:</strong> ${dateFormatted}
      </div>
    `
    : "";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(evaluatedSubject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="100%" max-width="640" cellpadding="0" cellspacing="0" border="0" style="max-width: 640px; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
          
          <!-- Top Header Strip -->
          <tr>
            <td style="background-color: #071b33; padding: 26px 32px; text-align: center; border-bottom: 3px solid #E09000;">
              <img src="${logoUrl}" alt="ABCN - Afropean Business & Culture Network" width="180" style="height: auto; max-width: 200px; display: block; margin: 0 auto;" />
              <div style="color: #94a3b8; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; margin-top: 10px;">
                ${escapeHtml(evaluatedEyebrow)}
              </div>
            </td>
          </tr>

          ${bannerImageHtml}

          <!-- Welcome Banner -->
          <tr>
            <td style="padding: 32px 32px 20px 32px;">
              <div style="display: inline-block; background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; margin-bottom: 16px;">
                ✓ Logged & Confirmed
              </div>
              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.3;">
                ${escapeHtml(evaluatedHeadline)}
              </h1>
              <div style="margin: 0 0 16px 0; font-size: 15px; color: #475569; line-height: 1.6;">
                ${evaluatedBody}
              </div>
              ${referenceIdHtml}
            </td>
          </tr>

          ${summaryTableHtml}

          ${nextStepsHtml}

          ${ctaHtml}

          <!-- Footer -->
          <tr>
            <td style="background-color: #071b33; padding: 24px 32px; text-align: center; color: #94a3b8; font-size: 12px; line-height: 1.5; border-top: 1px solid #1e293b;">
              <div style="font-weight: 700; color: #ffffff; margin-bottom: 4px;">Afropean Business & Culture Network (ABCN)</div>
              <div>${escapeHtml(evaluatedFooterNote)}</div>
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

  return { html, subject: evaluatedSubject };
}

/**
 * Builds an authentic, executive ABCN-branded confirmation email template
 */
export function buildApplicationConfirmationHtml(
  data: ApplicationEmailSummary,
  customConfig?: Partial<EmailTemplateConfig> | null,
  eventDetails?: any
): { html: string; subject: string } {
  return renderCustomEmailHtml(customConfig || DEFAULT_EMAIL_TEMPLATES[0], data, eventDetails);
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

/**
 * Builds an explicit, executive alert email for the ABCN internal team
 */
export function buildAdminApplicationAlertHtml(
  data: ApplicationEmailSummary,
  eventDetails?: any
): { html: string; subject: string } {
  const adminSubject = `[New Application] ${data.eventTitle} — ${data.firstName} ${data.lastName}${data.companyName ? ` (${data.companyName})` : ""}`;
  
  const adminConfig: Partial<EmailTemplateConfig> = {
    subject: adminSubject,
    eyebrow: "ABCN Executive Intake Alert",
    headline: "New Candidate Application Received",
    body: `A new candidate application has been submitted for <strong>${escapeHtml(data.eventTitle)}</strong>. Review the applicant dossier summary below or open the admin portal for full evaluation and scoring.`,
    show_reference_id: true,
    show_summary_table: true,
    next_steps_title: "Administrative Actions",
    next_steps_items: [
      "Access the Executive Admin Portal to review full dossier and pitch files.",
      "Assign admissions status (Reviewing, Shortlisted, Accepted, or Waitlisted).",
      "Direct founder inquiries can be directed to the applicant email: " + (data.email || ""),
    ],
    cta_text: "Review in Admin Portal",
    cta_url: "https://www.afropeanbusiness.com/admin/events",
    footer_note: "ABCN Internal Management System · Confidential Applicant Dossier",
  };

  return renderCustomEmailHtml(adminConfig, data, eventDetails);
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
