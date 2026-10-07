"use client";

import { useState, useEffect, useRef } from "react";
import { EmailTemplateConfig, DEFAULT_EMAIL_TEMPLATES, renderCustomEmailHtml } from "@/lib/email-templates";

interface EmailSettings {
  send_to_applicant: boolean;
  send_to_admin: boolean;
  admin_email: string;
}

interface EmailManagerProps {
  notify: (text: string, type?: "success" | "error") => void;
  // Optional: when embedded in Event Editor for event-specific customization
  eventMode?: boolean;
  eventTitle?: string;
  eventSlug?: string;
  eventVenue?: string;
  eventCity?: string;
  initialEventTemplate?: Partial<EmailTemplateConfig> | null;
  onSaveEventTemplate?: (template: Partial<EmailTemplateConfig> | null) => void;
}

export default function EmailManager({
  notify,
  eventMode = false,
  eventTitle = "ABCN Flagship Summit",
  eventSlug = "fiali-frankfurt-2026",
  eventVenue = "Frankfurt Marriott Hotel",
  eventCity = "Frankfurt am Main",
  initialEventTemplate = null,
  onSaveEventTemplate,
}: EmailManagerProps) {
  // Global settings state
  const [settings, setSettings] = useState<EmailSettings>({
    send_to_applicant: true,
    send_to_admin: true,
    admin_email: "afropeanbusiness@gmail.com",
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Template library state
  const [templates, setTemplates] = useState<EmailTemplateConfig[]>(DEFAULT_EMAIL_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("standard-confirmation");
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);

  // Event override toggle (when in eventMode)
  const [isCustomEventTemplate, setIsCustomEventTemplate] = useState<boolean>(
    Boolean(initialEventTemplate && Object.keys(initialEventTemplate).length > 0)
  );

  // Active editable template draft
  const [draft, setDraft] = useState<EmailTemplateConfig>(() => {
    if (initialEventTemplate && Object.keys(initialEventTemplate).length > 0) {
      return {
        ...DEFAULT_EMAIL_TEMPLATES[0],
        ...initialEventTemplate,
      };
    }
    return DEFAULT_EMAIL_TEMPLATES[0];
  });

  // UI view state: "edit" or "preview"
  const [previewMode, setPreviewMode] = useState<"edit" | "preview">("edit");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [testEmailAddress, setTestEmailAddress] = useState<string>("");
  const [testSending, setTestSending] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<string | null>(null);

  // Active focused input for tag insertion
  const [activeInputId, setActiveInputId] = useState<string>("subject");
  const activeInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Load settings and templates on mount
  useEffect(() => {
    loadSettings();
    loadTemplates();
  }, []);

  // Update draft if event template changes externally
  useEffect(() => {
    if (eventMode && initialEventTemplate && Object.keys(initialEventTemplate).length > 0) {
      setIsCustomEventTemplate(true);
      setDraft((prev) => ({ ...prev, ...initialEventTemplate }));
    }
  }, [eventMode, initialEventTemplate]);

  async function loadSettings() {
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/admin/settings/email", {
        headers: { Authorization: `Bearer ${localStorage.getItem("abcn_admin_token") || ""}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setSettings(json.data);
          if (!testEmailAddress) setTestEmailAddress(json.data.admin_email || "");
        }
      }
    } catch {
      // Keep defaults
    } finally {
      setSettingsLoading(false);
    }
  }

  async function saveSettings() {
    setSettingsSaving(true);
    try {
      const res = await fetch("/api/admin/settings/email", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("abcn_admin_token") || ""}`,
        },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to update settings");
      notify("Email notification preferences saved successfully!");
      if (json.data) setSettings(json.data);
    } catch (err: any) {
      notify(err.message || "Failed to save email settings", "error");
    } finally {
      setSettingsSaving(false);
    }
  }

  async function loadTemplates() {
    setTemplatesLoading(true);
    try {
      const res = await fetch("/api/admin/email-templates", {
        headers: { Authorization: `Bearer ${localStorage.getItem("abcn_admin_token") || ""}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          setTemplates(json.data);
          if (!eventMode || !isCustomEventTemplate) {
            const found = json.data.find((t: EmailTemplateConfig) => t.id === selectedTemplateId) || json.data[0];
            setDraft(found);
          }
        }
      }
    } catch {
      // Keep bundled templates
    } finally {
      setTemplatesLoading(false);
    }
  }

  function handleSelectTemplate(tmplId: string) {
    setSelectedTemplateId(tmplId);
    const selected = templates.find((t) => t.id === tmplId);
    if (selected) {
      setDraft(JSON.parse(JSON.stringify(selected)));
      if (eventMode && onSaveEventTemplate) {
        if (!isCustomEventTemplate) {
          onSaveEventTemplate(selected);
        }
      }
      notify(`Loaded template: ${selected.name}`);
    }
  }

  function handleFieldChange(field: keyof EmailTemplateConfig, value: any) {
    setDraft((prev) => {
      const updated = { ...prev, [field]: value };
      if (eventMode && onSaveEventTemplate) {
        onSaveEventTemplate(updated);
      }
      return updated;
    });
  }

  function handleNextStepChange(index: number, value: string) {
    const items = [...(draft.next_steps_items || [])];
    items[index] = value;
    handleFieldChange("next_steps_items", items);
  }

  function handleAddNextStep() {
    const items = [...(draft.next_steps_items || []), "New preparation item or guidance instruction."];
    handleFieldChange("next_steps_items", items);
  }

  function handleRemoveNextStep(index: number) {
    const items = (draft.next_steps_items || []).filter((_, idx) => idx !== index);
    handleFieldChange("next_steps_items", items);
  }

  function insertVariable(tag: string) {
    navigator.clipboard.writeText(tag);
    notify(`Variable copied: ${tag}`);

    // If focused on an input, insert at cursor
    if (activeInputRef.current) {
      const el = activeInputRef.current;
      const start = el.selectionStart || 0;
      const end = el.selectionEnd || 0;
      const val = el.value || "";
      const newVal = val.substring(0, start) + tag + val.substring(end);
      el.value = newVal;

      if (activeInputId === "subject") handleFieldChange("subject", newVal);
      else if (activeInputId === "headline") handleFieldChange("headline", newVal);
      else if (activeInputId === "eyebrow") handleFieldChange("eyebrow", newVal);
      else if (activeInputId === "body") handleFieldChange("body", newVal);
      else if (activeInputId === "cta_text") handleFieldChange("cta_text", newVal);
      else if (activeInputId === "cta_url") handleFieldChange("cta_url", newVal);
    }
  }

  async function handleSaveGlobalTemplate() {
    setTemplateSaving(true);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("abcn_admin_token") || ""}`,
        },
        body: JSON.stringify(draft),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save template");
      notify(`Template "${draft.name}" saved successfully!`);
      loadTemplates();
    } catch (err: any) {
      notify(err.message || "Failed to save template", "error");
    } finally {
      setTemplateSaving(false);
    }
  }

  async function handleSendTestEmail() {
    const target = (testEmailAddress || settings.admin_email).trim();
    if (!target) {
      notify("Please provide a recipient email address for testing.", "error");
      return;
    }

    setTestSending(true);
    setLastTestResult(null);

    try {
      const res = await fetch("/api/admin/email-templates/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("abcn_admin_token") || ""}`,
        },
        body: JSON.stringify({
          template: draft,
          targetEmail: target,
          eventTitle,
          eventSlug,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to send test email");

      setLastTestResult(json.message);
      notify(json.message);
    } catch (err: any) {
      notify(err.message || "Test email delivery failed", "error");
      setLastTestResult(`Error: ${err.message}`);
    } finally {
      setTestSending(false);
    }
  }

  // Generate dynamic sample data for live preview
  const sampleData = {
    applicantId: "DEMO-948210",
    eventTitle,
    firstName: "Amara",
    lastName: "Diallo",
    email: testEmailAddress || "amara.diallo@afrotech.io",
    phone: "+49 176 1234 5678",
    city: eventCity,
    country: "DE",
    companyName: "Nexus BioVentures",
    companyWebsite: "https://nexusbioventures.eu",
    roleTitle: "Founder & Chief Executive",
    businessModel: "CleanTech & B2B SaaS",
    ventureStage: "Growth & Series A Preparation",
    aiInterest: "Predictive Analytics, Automated Sourcing & Workflow Intelligence",
    motivation: "Expanding institutional cross-border networks and securing syndicate funding.",
    goals: "Collaborating with leading Frankfurt venture partners and institutional German accelerators.",
    submittedAt: new Date().toISOString(),
  };

  const sampleEventDetails = {
    title: eventTitle,
    slug: eventSlug,
    venue: eventVenue,
    city: eventCity,
    country: "Germany",
    date_label: "Upcoming Cohort",
  };

  const previewRender = renderCustomEmailHtml(draft, sampleData, sampleEventDetails);

  return (
    <div className="cms-email-manager" style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* 1. Global Dispatch Controls (Only in global admin mode) */}
      {!eventMode && (
        <div
          className="cms-card"
          style={{
            background: "var(--cms-surface)",
            border: "1px solid var(--cms-border)",
            borderRadius: "var(--cms-radius-md)",
            padding: "1.5rem",
            boxShadow: "var(--cms-shadow-card)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: "1rem",
              marginBottom: "1.25rem",
              paddingBottom: "1.25rem",
              borderBottom: "1px solid var(--cms-border)",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                <span style={{ fontSize: "1.3rem" }}>⚡</span>
                <h3 style={{ margin: 0, fontSize: "1.15rem", color: "var(--cms-text-primary)", fontWeight: 700 }}>
                  Automated Email Dispatch Engine
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--cms-text-secondary)", maxWidth: "680px" }}>
                Manage global delivery rules for outgoing candidate dossiers, confirmation receipts, and executive administrative alerts.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                onClick={saveSettings}
                disabled={settingsSaving || settingsLoading}
                className="cms-btn cms-btn-primary"
                style={{ fontSize: "0.85rem", padding: "8px 18px", fontWeight: 600 }}
              >
                {settingsSaving ? "Saving Preferences…" : "Save Dispatch Preferences"}
              </button>
            </div>
          </div>

          {/* Clean Modern 2-Column Toggle Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {/* Toggle 1: Send to Applicant */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "1.25rem",
                borderRadius: "var(--cms-radius-sm)",
                background: "var(--cms-surface-elevated)",
                border: settings.send_to_applicant ? "1px solid var(--cms-accent)" : "1px solid var(--cms-border)",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "1.1rem" }}>📬</span>
                    <strong style={{ fontSize: "0.95rem", color: "var(--cms-text-primary)" }}>
                      Applicant Confirmations
                    </strong>
                  </div>
                  <span style={{ fontSize: "0.8rem", color: "var(--cms-text-secondary)", lineHeight: 1.4, display: "block" }}>
                    Dispatches the branded confirmation email with reference ID and submission summary directly to the applicant upon form submission.
                  </span>
                </div>

                <label className="cms-switch-control" style={{ flexShrink: 0, marginTop: "2px" }}>
                  <input
                    type="checkbox"
                    checked={settings.send_to_applicant}
                    onChange={(e) => setSettings((prev) => ({ ...prev, send_to_applicant: e.target.checked }))}
                  />
                  <span className="cms-slider" />
                </label>
              </div>

              <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "3px 10px",
                    borderRadius: "999px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    background: settings.send_to_applicant ? "rgba(88, 172, 140, 0.15)" : "rgba(255, 255, 255, 0.05)",
                    color: settings.send_to_applicant ? "var(--cms-accent)" : "var(--cms-text-muted)",
                    border: `1px solid ${settings.send_to_applicant ? "var(--cms-accent)" : "var(--cms-border)"}`,
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: settings.send_to_applicant ? "var(--cms-accent)" : "var(--cms-text-muted)",
                    }}
                  />
                  {settings.send_to_applicant ? "Active · Delivery Enabled" : "Muted · No emails sent"}
                </span>
              </div>
            </div>

            {/* Toggle 2: Send to Admin */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "1.25rem",
                borderRadius: "var(--cms-radius-sm)",
                background: "var(--cms-surface-elevated)",
                border: settings.send_to_admin ? "1px solid var(--cms-accent)" : "1px solid var(--cms-border)",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "1.1rem" }}>🔔</span>
                    <strong style={{ fontSize: "0.95rem", color: "var(--cms-text-primary)" }}>
                      Administrative Alerts
                    </strong>
                  </div>
                  <span style={{ fontSize: "0.8rem", color: "var(--cms-text-secondary)", lineHeight: 1.4, display: "block" }}>
                    Sends an immediate notification / BCC copy to your executive inbox whenever a new founder application arrives.
                  </span>
                </div>

                <label className="cms-switch-control" style={{ flexShrink: 0, marginTop: "2px" }}>
                  <input
                    type="checkbox"
                    checked={settings.send_to_admin}
                    onChange={(e) => setSettings((prev) => ({ ...prev, send_to_admin: e.target.checked }))}
                  />
                  <span className="cms-slider" />
                </label>
              </div>

              <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "3px 10px",
                    borderRadius: "999px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    background: settings.send_to_admin ? "rgba(88, 172, 140, 0.15)" : "rgba(255, 255, 255, 0.05)",
                    color: settings.send_to_admin ? "var(--cms-accent)" : "var(--cms-text-muted)",
                    border: `1px solid ${settings.send_to_admin ? "var(--cms-accent)" : "var(--cms-border)"}`,
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: settings.send_to_admin ? "var(--cms-accent)" : "var(--cms-text-muted)",
                    }}
                  />
                  {settings.send_to_admin ? "Active · Alerting Enabled" : "Muted · Alerts off"}
                </span>
              </div>
            </div>

            {/* Recipient Input Row */}
            <div
              style={{
                gridColumn: "1 / -1",
                padding: "1.25rem",
                borderRadius: "var(--cms-radius-sm)",
                background: "var(--cms-surface-elevated)",
                border: "1px solid var(--cms-border)",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
              }}
            >
              <div style={{ flex: "1 1 300px" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "var(--cms-text-primary)", marginBottom: "4px" }}>
                  Admin Notification Inbox (Target Email)
                </label>
                <input
                  type="email"
                  value={settings.admin_email}
                  onChange={(e) => setSettings((prev) => ({ ...prev, admin_email: e.target.value }))}
                  placeholder="afropeanbusiness@gmail.com"
                  style={{
                    width: "100%",
                    maxWidth: "460px",
                    padding: "9px 12px",
                    borderRadius: "var(--cms-radius-sm)",
                    background: "var(--cms-input-bg)",
                    border: "1px solid var(--cms-border)",
                    color: "var(--cms-text-primary)",
                    fontSize: "0.88rem",
                  }}
                />
                <span style={{ display: "block", fontSize: "0.75rem", color: "var(--cms-text-muted)", marginTop: "4px" }}>
                  The administrative inbox that receives submissions, alert digests, and test deliveries.
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={testSending}
                  className="cms-btn cms-btn-secondary"
                  style={{ fontSize: "0.82rem", padding: "8px 16px", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <span>🚀</span> {testSending ? "Sending Test…" : "Send Test Email to this Inbox"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Template Selector & Mode Switcher */}
      <div
        className="cms-card"
        style={{
          background: "var(--cms-surface)",
          border: "1px solid var(--cms-border)",
          borderRadius: "var(--cms-radius-md)",
          padding: "1.5rem",
          boxShadow: "var(--cms-shadow-card)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ fontSize: "1.25rem" }}>🎨</span>
              <h3 style={{ margin: 0, fontSize: "1.15rem", color: "var(--cms-text-primary)", fontWeight: 700 }}>
                {eventMode ? `Confirmation Email for "${eventTitle}"` : "Email Template Studio"}
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--cms-text-secondary)" }}>
              {eventMode
                ? "Select a pre-designed confirmation template or customize the text and imagery specifically for this event."
                : "Select from the 5 curated ABCN executive templates, or customize dynamic variables and visual layouts."}
            </p>
          </div>

          {/* Action Tabs / Switches */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {eventMode && (
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "0.82rem",
                  color: "var(--cms-text-primary)",
                  cursor: "pointer",
                  background: "var(--cms-surface-elevated)",
                  padding: "6px 12px",
                  borderRadius: "var(--cms-radius-sm)",
                  border: "1px solid var(--cms-border)",
                }}
              >
                <input
                  type="checkbox"
                  checked={isCustomEventTemplate}
                  onChange={(e) => {
                    const custom = e.target.checked;
                    setIsCustomEventTemplate(custom);
                    if (!custom && onSaveEventTemplate) {
                      // Reset to selected template ID
                      const base = templates.find((t) => t.id === selectedTemplateId) || templates[0];
                      setDraft(base);
                      onSaveEventTemplate(null);
                    }
                  }}
                />
                <span>Custom Email for This Event</span>
              </label>
            )}

            <div
              style={{
                display: "inline-flex",
                background: "var(--cms-surface-elevated)",
                border: "1px solid var(--cms-border)",
                borderRadius: "var(--cms-radius-sm)",
                padding: "3px",
              }}
            >
              <button
                type="button"
                onClick={() => setPreviewMode("edit")}
                style={{
                  padding: "5px 14px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  borderRadius: "4px",
                  border: "none",
                  cursor: "pointer",
                  background: previewMode === "edit" ? "var(--cms-accent)" : "transparent",
                  color: previewMode === "edit" ? "#ffffff" : "var(--cms-text-secondary)",
                }}
              >
                ✏️ Editor
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("preview")}
                style={{
                  padding: "5px 14px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  borderRadius: "4px",
                  border: "none",
                  cursor: "pointer",
                  background: previewMode === "preview" ? "var(--cms-accent)" : "transparent",
                  color: previewMode === "preview" ? "#ffffff" : "var(--cms-text-secondary)",
                }}
              >
                👁️ Live Inbox Preview
              </button>
            </div>
          </div>
        </div>

        {/* Template Quick-Picker Grid (5 Seeded Templates) */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--cms-text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Curated Executive Templates (Seed Library)
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
              gap: "10px",
            }}
          >
            {templates.map((tmpl) => {
              const isSelected = selectedTemplateId === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tmpl.id!)}
                  style={{
                    padding: "10px 14px",
                    textAlign: "left",
                    borderRadius: "var(--cms-radius-sm)",
                    background: isSelected ? "rgba(88, 172, 140, 0.12)" : "var(--cms-surface-elevated)",
                    border: isSelected ? "1.5px solid var(--cms-accent)" : "1px solid var(--cms-border)",
                    color: "var(--cms-text-primary)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: isSelected ? "var(--cms-accent)" : "var(--cms-text-muted)",
                      }}
                    >
                      {tmpl.category || "General"}
                    </span>
                    {tmpl.is_default && (
                      <span style={{ fontSize: "0.68rem", background: "rgba(224,144,0,0.15)", color: "#E09000", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>
                        Default
                      </span>
                    )}
                  </div>
                  <strong style={{ fontSize: "0.85rem", lineHeight: 1.3 }}>{tmpl.name}</strong>
                  <span style={{ fontSize: "0.74rem", color: "var(--cms-text-secondary)", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {tmpl.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Variable Pill Inserter Bar */}
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "var(--cms-radius-sm)",
            background: "rgba(0,0,0,0.25)",
            border: "1px solid var(--cms-border)",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--cms-text-muted)", textTransform: "uppercase" }}>
              💡 Click to copy / insert variable:
            </span>
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              "{{first_name}}",
              "{{last_name}}",
              "{{company_name}}",
              "{{event_title}}",
              "{{venue}}",
              "{{city}}",
              "{{role_title}}",
              "{{application_id}}",
              "{{submitted_at}}",
            ].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => insertVariable(v)}
                title="Click to copy into clipboard"
                style={{
                  fontSize: "0.75rem",
                  fontFamily: "monospace",
                  background: "var(--cms-surface-elevated)",
                  border: "1px solid var(--cms-border)",
                  color: "var(--cms-accent)",
                  padding: "3px 8px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* ===================== VIEW 1: EDITOR ===================== */}
        {previewMode === "edit" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Grid 1: Basic Identifiers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
              {!eventMode && (
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--cms-text-secondary)", marginBottom: "4px" }}>
                    Template Display Name
                  </label>
                  <input
                    type="text"
                    value={draft.name || ""}
                    onChange={(e) => handleFieldChange("name", e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--cms-radius-sm)", background: "var(--cms-input-bg)", border: "1px solid var(--cms-border)", color: "var(--cms-text-primary)", fontSize: "0.88rem" }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--cms-text-secondary)", marginBottom: "4px" }}>
                  Subject Line <span style={{ color: "var(--cms-accent)" }}>*</span>
                </label>
                <input
                  id="subject"
                  ref={activeInputId === "subject" ? (activeInputRef as any) : undefined}
                  onFocus={() => setActiveInputId("subject")}
                  type="text"
                  value={draft.subject || ""}
                  onChange={(e) => handleFieldChange("subject", e.target.value)}
                  placeholder="Application Received: {{event_title}} — ABCN"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--cms-radius-sm)", background: "var(--cms-input-bg)", border: "1px solid var(--cms-border)", color: "var(--cms-text-primary)", fontSize: "0.88rem" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--cms-text-secondary)", marginBottom: "4px" }}>
                  Top Eyebrow / Tagline
                </label>
                <input
                  id="eyebrow"
                  ref={activeInputId === "eyebrow" ? (activeInputRef as any) : undefined}
                  onFocus={() => setActiveInputId("eyebrow")}
                  type="text"
                  value={draft.eyebrow || ""}
                  onChange={(e) => handleFieldChange("eyebrow", e.target.value)}
                  placeholder="Executive Program Application"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--cms-radius-sm)", background: "var(--cms-input-bg)", border: "1px solid var(--cms-border)", color: "var(--cms-text-primary)", fontSize: "0.88rem" }}
                />
              </div>
            </div>

            {/* Header Banner Image URL Support */}
            <div style={{ background: "var(--cms-surface-elevated)", padding: "1.25rem", borderRadius: "var(--cms-radius-sm)", border: "1px solid var(--cms-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <strong style={{ fontSize: "0.88rem", color: "var(--cms-text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>🖼️</span> Header Banner Image (Visual Image Support)
                  </strong>
                  <span style={{ fontSize: "0.78rem", color: "var(--cms-text-muted)" }}>
                    Add an executive hero photo or summit stage visual displayed at the top of the email.
                  </span>
                </div>
                {draft.header_image_url && (
                  <button
                    type="button"
                    onClick={() => handleFieldChange("header_image_url", "")}
                    className="cms-btn cms-btn-secondary"
                    style={{ fontSize: "0.75rem", padding: "4px 10px" }}
                  >
                    ✕ Remove Image
                  </button>
                )}
              </div>

              <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="text"
                  value={draft.header_image_url || ""}
                  onChange={(e) => handleFieldChange("header_image_url", e.target.value)}
                  placeholder="https://www.afropeanbusiness.com/assets/abcn/events/rooftop-community-gathering.jpg"
                  style={{ flex: "1 1 320px", padding: "9px 12px", borderRadius: "var(--cms-radius-sm)", background: "var(--cms-input-bg)", border: "1px solid var(--cms-border)", color: "var(--cms-text-primary)", fontSize: "0.85rem" }}
                />

                {draft.header_image_url && (
                  <div style={{ width: "90px", height: "46px", borderRadius: "6px", overflow: "hidden", border: "1px solid var(--cms-border)", flexShrink: 0, background: "#000" }}>
                    <img src={draft.header_image_url} alt="Banner Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
              </div>
            </div>

            {/* Headline & Body Text */}
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--cms-text-secondary)", marginBottom: "4px" }}>
                Main Headline
              </label>
              <input
                id="headline"
                ref={activeInputId === "headline" ? (activeInputRef as any) : undefined}
                onFocus={() => setActiveInputId("headline")}
                type="text"
                value={draft.headline || ""}
                onChange={(e) => handleFieldChange("headline", e.target.value)}
                placeholder="Thank you for applying, {{first_name}}!"
                style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--cms-radius-sm)", background: "var(--cms-input-bg)", border: "1px solid var(--cms-border)", color: "var(--cms-text-primary)", fontSize: "0.88rem" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--cms-text-secondary)", marginBottom: "4px" }}>
                Body Message (HTML / Paragraphs supported)
              </label>
              <textarea
                id="body"
                ref={activeInputId === "body" ? (activeInputRef as any) : undefined}
                onFocus={() => setActiveInputId("body")}
                rows={4}
                value={draft.body || ""}
                onChange={(e) => handleFieldChange("body", e.target.value)}
                placeholder="We have successfully received your candidate submission for <strong>{{event_title}}</strong>..."
                style={{ width: "100%", padding: "10px 12px", borderRadius: "var(--cms-radius-sm)", background: "var(--cms-input-bg)", border: "1px solid var(--cms-border)", color: "var(--cms-text-primary)", fontSize: "0.88rem", lineHeight: 1.5 }}
              />
            </div>

            {/* Dossier & Reference Toggles */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderRadius: "var(--cms-radius-sm)",
                  background: "var(--cms-surface-elevated)",
                  border: "1px solid var(--cms-border)",
                }}
              >
                <div>
                  <strong style={{ fontSize: "0.85rem", color: "var(--cms-text-primary)", display: "block" }}>
                    Candidate Reference ID Badge
                  </strong>
                  <span style={{ fontSize: "0.75rem", color: "var(--cms-text-muted)" }}>
                    Displays reference code ({`{{application_id}}`}) & submission date.
                  </span>
                </div>
                <label className="cms-switch-control">
                  <input
                    type="checkbox"
                    checked={draft.show_reference_id !== false}
                    onChange={(e) => handleFieldChange("show_reference_id", e.target.checked)}
                  />
                  <span className="cms-slider" />
                </label>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderRadius: "var(--cms-radius-sm)",
                  background: "var(--cms-surface-elevated)",
                  border: "1px solid var(--cms-border)",
                }}
              >
                <div>
                  <strong style={{ fontSize: "0.85rem", color: "var(--cms-text-primary)", display: "block" }}>
                    Submission Dossier Table
                  </strong>
                  <span style={{ fontSize: "0.75rem", color: "var(--cms-text-muted)" }}>
                    Includes formatted table of applicant answers.
                  </span>
                </div>
                <label className="cms-switch-control">
                  <input
                    type="checkbox"
                    checked={draft.show_summary_table !== false}
                    onChange={(e) => handleFieldChange("show_summary_table", e.target.checked)}
                  />
                  <span className="cms-slider" />
                </label>
              </div>
            </div>

            {/* Next Steps / Agenda Section Builder */}
            <div
              style={{
                background: "var(--cms-surface-elevated)",
                padding: "1.25rem",
                borderRadius: "var(--cms-radius-sm)",
                border: "1px solid var(--cms-border)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <strong style={{ fontSize: "0.9rem", color: "var(--cms-text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>📌</span> Next Steps & Instructions Box
                  </strong>
                  <span style={{ fontSize: "0.78rem", color: "var(--cms-text-muted)" }}>
                    Actionable instructions displayed below the submission table.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddNextStep}
                  className="cms-btn cms-btn-secondary"
                  style={{ fontSize: "0.78rem", padding: "5px 12px" }}
                >
                  + Add Bullet Item
                </button>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "0.78rem", color: "var(--cms-text-secondary)", marginBottom: "4px" }}>
                  Box Title
                </label>
                <input
                  type="text"
                  value={draft.next_steps_title || ""}
                  onChange={(e) => handleFieldChange("next_steps_title", e.target.value)}
                  placeholder="What Happens Next?"
                  style={{ width: "100%", maxWidth: "380px", padding: "8px 12px", borderRadius: "var(--cms-radius-sm)", background: "var(--cms-input-bg)", border: "1px solid var(--cms-border)", color: "var(--cms-text-primary)", fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {(draft.next_steps_items || []).map((step, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--cms-text-muted)", width: "18px" }}>
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={step}
                      onChange={(e) => handleNextStepChange(idx, e.target.value)}
                      style={{ flex: 1, padding: "8px 12px", borderRadius: "var(--cms-radius-sm)", background: "var(--cms-input-bg)", border: "1px solid var(--cms-border)", color: "var(--cms-text-primary)", fontSize: "0.85rem" }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveNextStep(idx)}
                      className="cms-btn cms-btn-secondary"
                      style={{ padding: "6px 10px", fontSize: "0.75rem", color: "var(--cms-danger)" }}
                      title="Remove step"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Button and Footer Note */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--cms-text-secondary)", marginBottom: "4px" }}>
                  Call to Action (Button Label)
                </label>
                <input
                  id="cta_text"
                  ref={activeInputId === "cta_text" ? (activeInputRef as any) : undefined}
                  onFocus={() => setActiveInputId("cta_text")}
                  type="text"
                  value={draft.cta_text || ""}
                  onChange={(e) => handleFieldChange("cta_text", e.target.value)}
                  placeholder="View Event Details"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--cms-radius-sm)", background: "var(--cms-input-bg)", border: "1px solid var(--cms-border)", color: "var(--cms-text-primary)", fontSize: "0.88rem" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--cms-text-secondary)", marginBottom: "4px" }}>
                  Button URL Link
                </label>
                <input
                  id="cta_url"
                  ref={activeInputId === "cta_url" ? (activeInputRef as any) : undefined}
                  onFocus={() => setActiveInputId("cta_url")}
                  type="text"
                  value={draft.cta_url || ""}
                  onChange={(e) => handleFieldChange("cta_url", e.target.value)}
                  placeholder="https://www.afropeanbusiness.com/events/{{event_slug}}"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--cms-radius-sm)", background: "var(--cms-input-bg)", border: "1px solid var(--cms-border)", color: "var(--cms-text-primary)", fontSize: "0.88rem" }}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--cms-text-secondary)", marginBottom: "4px" }}>
                  Footer Subtitle / Signature Note
                </label>
                <input
                  type="text"
                  value={draft.footer_note || ""}
                  onChange={(e) => handleFieldChange("footer_note", e.target.value)}
                  placeholder="Afropean Business & Culture Network (ABCN) · Connecting Afropean founders, innovators & capital."
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--cms-radius-sm)", background: "var(--cms-input-bg)", border: "1px solid var(--cms-border)", color: "var(--cms-text-primary)", fontSize: "0.88rem" }}
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={testSending}
                  className="cms-btn cms-btn-secondary"
                  style={{ fontSize: "0.85rem", padding: "8px 16px", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <span>🚀</span> {testSending ? "Sending Test…" : "Send Test Preview to My Email"}
                </button>
              </div>

              {!eventMode && (
                <button
                  type="button"
                  onClick={handleSaveGlobalTemplate}
                  disabled={templateSaving}
                  className="cms-btn cms-btn-primary"
                  style={{ fontSize: "0.85rem", padding: "8px 20px" }}
                >
                  {templateSaving ? "Saving Template…" : "Save Template to Library"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ===================== VIEW 2: LIVE PREVIEW ===================== */}
        {previewMode === "preview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Preview Toolbar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                padding: "10px 14px",
                background: "var(--cms-surface-elevated)",
                borderRadius: "var(--cms-radius-sm)",
                border: "1px solid var(--cms-border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--cms-text-secondary)" }}>
                  Subject:
                </span>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--cms-text-primary)" }}>
                  {previewRender.subject}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ display: "flex", border: "1px solid var(--cms-border)", borderRadius: "4px", overflow: "hidden" }}>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    style={{
                      padding: "4px 10px",
                      fontSize: "0.78rem",
                      border: "none",
                      cursor: "pointer",
                      background: previewDevice === "desktop" ? "var(--cms-accent)" : "transparent",
                      color: previewDevice === "desktop" ? "#fff" : "var(--cms-text-muted)",
                    }}
                  >
                    💻 Desktop (640px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    style={{
                      padding: "4px 10px",
                      fontSize: "0.78rem",
                      border: "none",
                      cursor: "pointer",
                      background: previewDevice === "mobile" ? "var(--cms-accent)" : "transparent",
                      color: previewDevice === "mobile" ? "#fff" : "var(--cms-text-muted)",
                    }}
                  >
                    📱 Mobile (380px)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={testSending}
                  className="cms-btn cms-btn-primary"
                  style={{ fontSize: "0.78rem", padding: "6px 14px" }}
                >
                  {testSending ? "Sending…" : "🚀 Send Live Test"}
                </button>
              </div>
            </div>

            {/* Visual Email Frame Container */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                background: "rgba(0, 0, 0, 0.4)",
                padding: "24px 12px",
                borderRadius: "var(--cms-radius-md)",
                overflow: "auto",
              }}
            >
              <div
                style={{
                  width: previewDevice === "desktop" ? "100%" : "380px",
                  maxWidth: previewDevice === "desktop" ? "680px" : "380px",
                  borderRadius: "14px",
                  overflow: "hidden",
                  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.45)",
                  background: "#f1f5f9",
                  transition: "max-width 0.3s ease",
                }}
              >
                <div
                  style={{ width: "100%" }}
                  dangerouslySetInnerHTML={{ __html: previewRender.html }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Live Test Feedback Banner */}
        {lastTestResult && (
          <div
            style={{
              marginTop: "1rem",
              padding: "10px 14px",
              borderRadius: "var(--cms-radius-sm)",
              fontSize: "0.82rem",
              background: lastTestResult.startsWith("Error") ? "rgba(239,68,68,0.12)" : "rgba(88,172,140,0.12)",
              border: `1px solid ${lastTestResult.startsWith("Error") ? "var(--cms-danger)" : "var(--cms-accent)"}`,
              color: lastTestResult.startsWith("Error") ? "var(--cms-danger)" : "var(--cms-accent)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>{lastTestResult.startsWith("Error") ? "✕" : "✓"}</span>
            <span>{lastTestResult}</span>
          </div>
        )}
      </div>
    </div>
  );
}
