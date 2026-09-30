"use client";

import React, { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getPathname, type Locale } from "@/i18n/routing";
import {
  allFields,
  buildDefaultForm,
  displayValue,
  initialValues,
  parseForm,
  pickText,
  validateFields,
  type AnswerValue,
  type Answers,
  type ApplicationForm,
  type FormField,
} from "@/lib/application-form";

type Props = {
  eventId?: string;
  eventSlug: string;
  eventTitle: string;
  grants?: { count?: number; amount_each?: string; title?: string } | null;
  applicationDeadline?: string | null;
  /** The event's custom form from the CMS; null/undefined = the default form. */
  form?: unknown;
};

// Existing translated messages for the standard fields' errors.
const CORE_ERR_KEYS: Record<string, string> = {
  firstName: "errFirstName",
  lastName: "errLastName",
  jobTitle: "errJobTitle",
  email: "errEmail",
  companyName: "errCompanyName",
  sector: "errSector",
  motivation: "errMotivation",
};

export default function MultiStepApplication({
  eventId,
  eventSlug,
  eventTitle,
  grants,
  form: customForm,
}: Props) {
  const locale = useLocale();
  const t = useTranslations("application");
  // Localized URL for the privacy notice (/privacy or /de/datenschutz).
  const privacyHref = getPathname({ href: "/privacy", locale: locale as Locale });

  const hasGrants = Boolean(grants?.title || grants?.amount_each);
  const form: ApplicationForm = useMemo(
    () => parseForm(customForm) ?? buildDefaultForm(hasGrants),
    [customForm, hasGrants]
  );
  const steps = form.steps;
  const reviewStep = steps.length + 1; // fixed final step: review + consent

  const [step, setStep] = useState<number>(1);
  const [values, setValues] = useState<Answers>(() => initialValues(form));
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>("");

  const txt = (en?: string, de?: string) =>
    pickText(en, de, locale).replace(/\{eventTitle\}/g, eventTitle);
  const valueOf = (core: string): string => {
    const f = allFields(form).find((x) => x.core === core);
    return f ? String(values[f.id] ?? "") : "";
  };

  const setValue = (id: string, value: AnswerValue) => {
    setValues((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const errorText = (field: FormField, code: string): string => {
    if (field.core && CORE_ERR_KEYS[field.core] && (code === "required" || code === "email" || code === "tooShort")) {
      return t(CORE_ERR_KEYS[field.core] as any);
    }
    const generic: Record<string, string> = {
      required: t("errRequired"),
      email: t("errEmail"),
      url: t("errUrl"),
      number: t("errNumber"),
      date: t("errDate"),
      option: t("errOption"),
      tooShort: t("errTooShort", { min: field.minLength ?? 0 }),
    };
    return generic[code] || t("errRequired");
  };

  const validateStep = (currentStep: number): boolean => {
    const err: Record<string, string> = {};
    if (currentStep <= steps.length) {
      const fields = steps[currentStep - 1].fields;
      const found = validateFields(fields, values);
      for (const f of fields) if (found[f.id]) err[f.id] = errorText(f, found[f.id]);
    } else if (!consent) {
      err.consent = t("errConsent");
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, reviewStep));
  };

  const handlePrev = () => {
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(reviewStep)) return;

    setSubmitError("");
    setIsSubmitting(true);

    try {
      // Standard fields go in their own named properties; everything else in
      // `answers`. The server re-validates against the stored form.
      const core: Record<string, unknown> = {};
      const answers: Answers = {};
      for (const f of allFields(form)) {
        if (f.core) core[f.core] = values[f.id];
        else answers[f.id] = values[f.id];
      }
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          eventSlug,
          ...core,
          country: "DE",
          answers,
          referralSource: "",
          consent,
        }),
      });

      const json = await res.json();
      if (!res.ok || json?.error) {
        throw new Error(json?.error || t("errSubmit"));
      }

      setIsSubmitted(true);
    } catch (err: any) {
      setSubmitError(err?.message || t("errSubmit"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const indicator = [
    ...steps.map((st, i) => ({ num: String(i + 1).padStart(2, "0"), label: txt(st.label, st.label_de) })),
    { num: String(reviewStep).padStart(2, "0"), label: t("step4Label") },
  ];

  if (isSubmitted) {
    return (
      <div className="wizard-box" style={{ padding: "40px 32px", textAlign: "center" }}>
        <div style={{
          width: "68px",
          height: "68px",
          borderRadius: "50%",
          background: "rgba(79, 140, 201, 0.15)",
          color: "#4F8CC9",
          fontSize: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
          border: "1px solid rgba(79, 140, 201, 0.3)"
        }}>
          ✓
        </div>
        <div style={{
          display: "inline-block",
          padding: "4px 14px",
          borderRadius: "999px",
          background: "rgba(79, 140, 201, 0.1)",
          border: "1px solid rgba(79, 140, 201, 0.3)",
          color: "#4F8CC9",
          fontSize: "0.68rem",
          fontWeight: 800,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: "12px"
        }}>
          {t("receivedBadge")}
        </div>
        <h3 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#fff", margin: "0 0 10px", fontFamily: "var(--font-serif, Georgia, serif)" }}>
          {t("successTitle", { eventTitle })}
        </h3>
        <p style={{ color: "#b9c7d4", fontSize: "0.85rem", maxWidth: "540px", margin: "0 auto 20px", lineHeight: "1.6" }}>
          {t("successBody", {
            name: valueOf("firstName"),
            company: valueOf("companyName") || (locale === "de" ? "Ihr Unternehmen" : "your venture")
          })}
        </p>
        <div style={{
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "14px",
          padding: "16px 20px",
          maxWidth: "420px",
          margin: "0 auto 28px",
          fontSize: "0.76rem",
          color: "#8da4b8",
          textAlign: "left",
          lineHeight: "1.6"
        }}>
          <div>• {t("replyTo")} <strong style={{ color: "#fff" }}>{valueOf("email")}</strong></div>
          <div>• {t("programme")} <strong style={{ color: "#E09000" }}>{eventTitle}</strong></div>
          <div>• {t("questions")} <span style={{ color: "#fff" }}>harmonie.essome@softxcloud.net</span></div>
        </div>
        <button
          type="button"
          onClick={() => {
            setValues(initialValues(form));
            setConsent(false);
            setStep(1);
            setIsSubmitted(false);
          }}
          className="wizard-btn-prev"
        >
          {t("submitAnother")}
        </button>
      </div>
    );
  }

  return (
    <div className="wizard-box">
      <div className="wizard-stripe" />

      <div className="wizard-content">
        {/* Step Indicator Header */}
        <div className="wizard-steps-header">
          {indicator.map((s, idx) => {
            const stepIndex = idx + 1;
            const isActive = step === stepIndex;
            const isPast = step > stepIndex;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => {
                  if (isPast) setStep(stepIndex);
                }}
                disabled={!isPast && !isActive}
                className={`wizard-step-indicator ${isActive ? "active" : isPast ? "done" : ""}`}
              >
                <span className="wizard-step-num">{isPast ? "✓" : s.num}</span>
                <span className="wizard-step-lbl">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate>
          {step <= steps.length && (
            <div>
              <div className="wizard-heading-group">
                <h3>{txt(steps[step - 1].title, steps[step - 1].title_de)}</h3>
                {(steps[step - 1].subtitle || steps[step - 1].subtitle_de) && (
                  <p>{txt(steps[step - 1].subtitle, steps[step - 1].subtitle_de)}</p>
                )}
              </div>

              <div className="wizard-form-grid">
                {steps[step - 1].fields.map((field) => (
                  <FieldInput
                    key={field.id}
                    field={field}
                    value={values[field.id]}
                    error={errors[field.id]}
                    onChange={(v) => setValue(field.id, v)}
                    txt={txt}
                    optionalLabel={t("optional")}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Final step: review everything + consent */}
          {step === reviewStep && (
            <div>
              <div className="wizard-heading-group">
                <h3>{t("step4Title")}</h3>
                <p>{t("step4Subtitle")}</p>
              </div>

              <div className="wizard-review-card">
                {steps.map((st) => (
                  <div key={st.id} style={{ marginBottom: "14px" }}>
                    <div className="wizard-review-row" style={{ flexWrap: "wrap", borderBottom: "none", paddingBottom: 0 }}>
                      {st.fields.map((f) => (
                        <div className="wizard-review-item" key={f.id} style={{ minWidth: "45%" }}>
                          <span>{txt(f.label, f.label_de)}</span>
                          <strong style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                            {displayValue(f, values[f.id], locale)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "14px" }}>
                <label className="gdpr-consent-label">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => {
                      setConsent(e.target.checked);
                      if (errors.consent) setErrors({});
                    }}
                  />
                  <span>
                    {t("consentText")}{" "}
                    <a
                      href={privacyHref}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#E09000", textDecoration: "underline", background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit" }}
                    >
                      {t("privacyLink")}
                    </a>
                    {t("consentTail")}
                  </span>
                </label>
                {errors.consent && <div className="wizard-err">{errors.consent}</div>}
              </div>
            </div>
          )}

          {submitError && (
            <div
              role="alert"
              style={{
                marginTop: "18px",
                padding: "12px 16px",
                borderRadius: "12px",
                background: "rgba(214, 69, 69, 0.12)",
                border: "1px solid rgba(214, 69, 69, 0.35)",
                color: "#ffb4b4",
                fontSize: "0.8rem",
                lineHeight: 1.55,
              }}
            >
              {submitError}
            </div>
          )}

          {/* Navigation Controls */}
          <div className="wizard-nav-controls">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="wizard-btn-prev"
              >
                {t("prevBtn")}
              </button>
            ) : (
              <div />
            )}

            {step < reviewStep ? (
              <button
                type="button"
                onClick={handleNext}
                className="wizard-btn-next"
              >
                {t("nextBtn", { step: indicator[step]?.label || "" })}
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="wizard-btn-submit"
              >
                {isSubmitting ? t("submittingBtn") : t("submitBtn")}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  error,
  onChange,
  txt,
  optionalLabel,
}: {
  field: FormField;
  value: AnswerValue | undefined;
  error?: string;
  onChange: (v: AnswerValue) => void;
  txt: (en?: string, de?: string) => string;
  optionalLabel: string;
}) {
  const id = `f-${field.id}`;
  const label = txt(field.label, field.label_de);
  const placeholder = txt(field.placeholder, field.placeholder_de) || undefined;
  const help = txt(field.help, field.help_de);
  const options = field.options || [];
  const str = typeof value === "string" ? value : "";
  const span = field.width === "full" || field.type === "textarea" ? " full-span" : "";

  let control: React.ReactNode;
  switch (field.type) {
    case "textarea":
      control = <textarea id={id} rows={4} value={str} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "select":
      control = (
        <select id={id} value={str} onChange={(e) => onChange(e.target.value)}>
          {!options.some((o) => o.value === str) && <option value="">—</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {txt(o.label, o.label_de)}
            </option>
          ))}
        </select>
      );
      break;
    case "radio":
      control = (
        <div role="radiogroup" aria-labelledby={`${id}-l`} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {options.map((o) => (
            <label key={o.value} style={{ display: "flex", gap: "8px", alignItems: "center", cursor: "pointer" }}>
              <input type="radio" name={id} checked={str === o.value} onChange={() => onChange(o.value)} />
              <span>{txt(o.label, o.label_de)}</span>
            </label>
          ))}
        </div>
      );
      break;
    case "checkboxes": {
      const arr = Array.isArray(value) ? value : [];
      control = (
        <div role="group" aria-labelledby={`${id}-l`} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {options.map((o) => (
            <label key={o.value} style={{ display: "flex", gap: "8px", alignItems: "center", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={arr.includes(o.value)}
                onChange={(e) => onChange(e.target.checked ? [...arr, o.value] : arr.filter((x) => x !== o.value))}
              />
              <span>{txt(o.label, o.label_de)}</span>
            </label>
          ))}
        </div>
      );
      break;
    }
    case "checkbox":
      control = (
        <label style={{ display: "flex", gap: "8px", alignItems: "flex-start", cursor: "pointer" }}>
          <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
          <span>{label}</span>
        </label>
      );
      break;
    default:
      control = (
        <input
          id={id}
          type={field.type}
          inputMode={field.type === "number" ? "decimal" : undefined}
          value={str}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }

  return (
    <div className={`wizard-field${span}`}>
      {field.type !== "checkbox" && (
        <label id={`${id}-l`} htmlFor={id}>
          {label}{" "}
          {field.required ? <span className="req">*</span> : <span className="opt">{optionalLabel}</span>}
        </label>
      )}
      {control}
      {help && <div style={{ fontSize: "0.74rem", opacity: 0.7, marginTop: "4px" }}>{help}</div>}
      {error && <div className="wizard-err">{error}</div>}
    </div>
  );
}
