import en from "@/messages/en.json";
import de from "@/messages/de.json";

/**
 * Application form schema.
 *
 * An event's form lives in events.application_form. NULL means "the default
 * form" (buildDefaultForm), which reproduces the original fixed application
 * exactly. Customising a form stores a full copy of the schema on the event,
 * so editing one event never affects another.
 *
 * This file is shared by the browser (rendering + validation), the server
 * (re-validation, because the browser can never be trusted) and the CMS builder.
 */

export type FieldType =
  | "text"
  | "email"
  | "tel"
  | "url"
  | "number"
  | "textarea"
  | "select"
  | "radio"
  | "checkboxes"
  | "checkbox"
  | "date"
  | "file";

/**
 * Standard fields map to a column on the applicant record (used by the
 * pipeline, filters and CSV). Anything without a `core` is a custom question
 * and is stored in `answers`.
 */
export type CoreKey =
  | "firstName"
  | "lastName"
  | "jobTitle"
  | "location"
  | "email"
  | "phone"
  | "companyName"
  | "companyUrl"
  | "sector"
  | "stage"
  | "aiFocus"
  | "motivation"
  | "grantInterest";

/** The applicant record cannot exist without these three. */
export const REQUIRED_CORE: CoreKey[] = ["firstName", "lastName", "email"];

export const CORE_LABELS: Record<CoreKey, string> = {
  firstName: "First name",
  lastName: "Last name",
  jobTitle: "Role title",
  location: "Location",
  email: "Email",
  phone: "Phone",
  companyName: "Company name",
  companyUrl: "Company website",
  sector: "Sector",
  stage: "Venture stage",
  aiFocus: "AI / digital focus",
  motivation: "Motivation",
  grantInterest: "Grant / programme interest",
};

export interface FormOption {
  value: string;
  label: string;
  label_de?: string;
}

/** Show a question only when an earlier answer matches. */
export interface ShowIf {
  /** id of an earlier question */
  field: string;
  op: "equals" | "notEquals" | "includes" | "filled";
  value?: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  core?: CoreKey;
  label: string;
  label_de?: string;
  placeholder?: string;
  placeholder_de?: string;
  help?: string;
  help_de?: string;
  required?: boolean;
  minLength?: number;
  width?: "half" | "full";
  options?: FormOption[];
  default?: string;
  showIf?: ShowIf;
}

export interface FormStep {
  id: string;
  /** Short name shown in the step indicator. */
  label: string;
  label_de?: string;
  title: string;
  title_de?: string;
  subtitle?: string;
  subtitle_de?: string;
  fields: FormField[];
}

export interface ApplicationForm {
  version: 1;
  steps: FormStep[];
}

export type AnswerValue = string | string[] | boolean;
export type Answers = Record<string, AnswerValue>;

export const CHOICE_TYPES: FieldType[] = ["select", "radio", "checkboxes"];
export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Short text",
  textarea: "Long text",
  email: "Email",
  tel: "Phone number",
  url: "Website link",
  number: "Number",
  date: "Date",
  select: "Dropdown",
  radio: "Single choice",
  checkboxes: "Multiple choice",
  checkbox: "Yes / No tick box",
  file: "File upload",
};

/** Uploads: size cap (Vercel request limit is 4.5 MB) and accepted extensions. */
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const FILE_EXTENSIONS = ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt", "csv", "png", "jpg", "jpeg"];

const MAX_TEXT = 5000;

/** Picks the German variant when asked for and present, else English. */
export function pickText(en: string | undefined, deVal: string | undefined, locale: string): string {
  return (locale === "de" && deVal && deVal.trim() ? deVal : en) || "";
}

// ---------------------------------------------------------------------------
// Default form: the original fixed application, built from the site messages.
// ---------------------------------------------------------------------------

type Msgs = Record<string, string>;
const M = {
  en: (en as unknown as { application: Msgs }).application,
  de: (de as unknown as { application: Msgs }).application,
};

const both = (key: string) => ({ en: M.en[key] ?? key, de: M.de[key] ?? M.en[key] ?? key });

function opt(value: string, key: string): FormOption {
  const t = both(key);
  return { value, label: t.en, label_de: t.de };
}

export function buildDefaultForm(hasGrants = false): ApplicationForm {
  const f = (
    id: string,
    type: FieldType,
    labelKey: string,
    extra: Partial<FormField> & { placeholderKey?: string; optional?: boolean } = {}
  ): FormField => {
    const { placeholderKey, optional, ...rest } = extra;
    const l = both(labelKey);
    const ph = placeholderKey ? both(placeholderKey) : null;
    return {
      id,
      type,
      label: l.en,
      label_de: l.de,
      ...(ph ? { placeholder: ph.en, placeholder_de: ph.de } : {}),
      required: !optional,
      width: "half",
      ...rest,
    };
  };
  const step = (n: 1 | 2 | 3, fields: FormField[]): FormStep => {
    const label = both(`step${n}Label`);
    const title = both(`step${n}Title`);
    const sub = both(`step${n}Subtitle`);
    return {
      id: `step-${n}`,
      label: label.en,
      label_de: label.de,
      title: title.en,
      title_de: title.de,
      subtitle: sub.en,
      subtitle_de: sub.de,
      fields,
    };
  };

  return {
    version: 1,
    steps: [
      step(1, [
        f("firstName", "text", "firstName", { core: "firstName", placeholderKey: "firstNamePlaceholder" }),
        f("lastName", "text", "lastName", { core: "lastName", placeholderKey: "lastNamePlaceholder" }),
        f("jobTitle", "text", "jobTitle", { core: "jobTitle", placeholderKey: "jobTitlePlaceholder" }),
        f("location", "select", "location", {
          core: "location",
          default: "Frankfurt am Main",
          options: [opt("Frankfurt am Main", "locationFrankfurt"), opt("Rhein-Main Region", "locationRheinMain")],
        }),
        f("email", "email", "email", { core: "email", placeholderKey: "emailPlaceholder" }),
        f("phone", "tel", "phone", { core: "phone", placeholderKey: "phonePlaceholder", optional: true }),
      ]),
      step(2, [
        f("companyName", "text", "companyName", { core: "companyName", placeholderKey: "companyNamePlaceholder" }),
        f("companyUrl", "url", "companyUrl", { core: "companyUrl", placeholderKey: "companyUrlPlaceholder", optional: true }),
        f("sector", "select", "sector", {
          core: "sector",
          default: "Technology & Software (IT, SaaS, Digital)",
          options: [
            opt("Technology & Software (IT, SaaS, Digital)", "sectorTech"),
            opt("Consulting & Professional Services", "sectorServices"),
            opt("Retail, E-Commerce & Consumer Goods", "sectorCommerce"),
            opt("Creative Industries, Media & Design", "sectorCreative"),
            opt("Health, Care & Life Sciences", "sectorHealth"),
            opt("Finance, Insurance & FinTech", "sectorFintech"),
            opt("Food, Gastronomy & Hospitality", "sectorFood"),
            opt("Education, Coaching & HR", "sectorEdtech"),
            opt("Sustainability, Climate & GreenTech", "sectorSustainability"),
            opt("Social Impact & Community Venture", "sectorSocial"),
            opt("Other / Cross-Sector Industry", "sectorOther"),
          ],
        }),
        f("stage", "select", "stage", {
          core: "stage",
          default: "Idea stage (not founded yet)",
          options: [
            opt("Idea stage (not founded yet)", "stageIdea"),
            opt("In incorporation / Preparing launch", "stageIncorporation"),
            opt("Founded already (Building prototype / MVP)", "stageMvp"),
            opt("Already in business (Early customers / revenue)", "stageEarlyRev"),
            opt("Established business (Scaling & growth phase)", "stageGrowth"),
            opt("Bootstrapped & profitable", "stageProfitable"),
          ],
        }),
      ]),
      step(3, [
        f("motivation", "textarea", "motivationLabel", {
          core: "motivation",
          placeholderKey: "motivationPlaceholder",
          minLength: 15,
          width: "full",
        }),
        f("aiFocus", "text", "aiFocusLabel", {
          core: "aiFocus",
          placeholderKey: "aiFocusPlaceholder",
          optional: true,
          width: "full",
        }),
        f("grantInterest", "select", hasGrants ? "grantInterestLabel" : "grantInterestGeneralLabel", {
          core: "grantInterest",
          required: false,
          width: "full",
          default: "Yes, interested in the grant",
          options: [
            opt("Yes, interested in the grant", "grantOption1"),
            opt("Focusing on ecosystem networking & mentorship", "grantOption2"),
            opt("Interested in both", "grantOption3"),
          ],
        }),
      ]),
    ],
  };
}

/** Parses whatever the database returned into a usable schema, or null. */
export function parseForm(raw: unknown): ApplicationForm | null {
  let v: any = raw;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return null;
    }
  }
  if (!v || typeof v !== "object" || !Array.isArray(v.steps) || v.steps.length === 0) return null;
  return v as ApplicationForm;
}

export const allFields = (form: ApplicationForm): FormField[] => form.steps.flatMap((s) => s.fields);

// ---------------------------------------------------------------------------
// Conditional questions
// ---------------------------------------------------------------------------

function comparable(v: AnswerValue | undefined): string | string[] {
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (Array.isArray(v)) return v;
  return String(v ?? "").trim();
}

/** Whether a question is shown given the answers so far. */
export function isVisible(field: FormField, values: Answers): boolean {
  const c = field.showIf;
  if (!c || !c.field) return true;
  const v = comparable(values[c.field]);
  const target = (c.value ?? "").trim();
  switch (c.op) {
    case "filled":
      return Array.isArray(v) ? v.length > 0 : v !== "";
    case "notEquals":
      return Array.isArray(v) ? !v.includes(target) : v !== target;
    case "includes":
    case "equals":
    default:
      return Array.isArray(v) ? v.includes(target) : v === target;
  }
}

export const visibleFields = (step: FormStep, values: Answers): FormField[] =>
  step.fields.filter((f) => isVisible(f, values));

/** Steps that still have at least one visible question. */
export const visibleSteps = (form: ApplicationForm, values: Answers): FormStep[] =>
  form.steps.filter((st) => visibleFields(st, values).length > 0);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isFileId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

// ---------------------------------------------------------------------------
// Validation (shared by the browser and the server)
// ---------------------------------------------------------------------------

export type FieldError = "required" | "email" | "url" | "number" | "tooShort" | "option" | "date";

const isEmpty = (v: AnswerValue | undefined) =>
  v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0) || v === false;

/** Returns an error code for one field, or null when the value is acceptable. */
export function validateField(field: FormField, value: AnswerValue | undefined): FieldError | null {
  if (field.type === "checkbox") {
    return field.required && value !== true ? "required" : null;
  }
  if (isEmpty(value)) return field.required ? "required" : null;

  if (field.type === "checkboxes") {
    const arr = Array.isArray(value) ? value : [];
    const allowed = new Set((field.options || []).map((o) => o.value));
    return arr.every((x) => allowed.has(x)) ? null : "option";
  }
  const s = String(value).trim();
  if (!s) return field.required ? "required" : null;

  switch (field.type) {
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? null : "email";
    case "url":
      return /^https?:\/\/\S+\.\S+/i.test(s) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(s) ? null : "url";
    case "number":
      return Number.isFinite(Number(s)) ? null : "number";
    case "date":
      return /^\d{4}-\d{2}-\d{2}$/.test(s) ? null : "date";
    case "file":
      return isFileId(s) ? null : "option";
    case "select":
    case "radio":
      return (field.options || []).some((o) => o.value === s) ? null : "option";
    default:
      return field.minLength && s.length < field.minLength ? "tooShort" : null;
  }
}

/** Validates the given fields; returns { fieldId: code } for every problem. */
export function validateFields(fields: FormField[], values: Answers): Record<string, FieldError> {
  const errors: Record<string, FieldError> = {};
  for (const field of fields) {
    if (!isVisible(field, values)) continue; // a hidden question is never required
    const e = validateField(field, values[field.id]);
    if (e) errors[field.id] = e;
  }
  return errors;
}

/** Initial values: field defaults, empty otherwise. */
export function initialValues(form: ApplicationForm): Answers {
  const out: Answers = {};
  for (const field of allFields(form)) {
    if (field.type === "checkbox") out[field.id] = false;
    else if (field.type === "checkboxes") out[field.id] = [];
    else out[field.id] = field.default ?? (field.type === "select" && field.options?.[0] && field.required ? field.options[0].value : "");
  }
  return out;
}

/** Human-readable text for a stored or submitted value (review step, CSV, CMS). */
export function displayValue(field: FormField, value: AnswerValue | undefined, locale = "en"): string {
  if (field.type === "checkbox") return value === true ? (locale === "de" ? "Ja" : "Yes") : locale === "de" ? "Nein" : "No";
  const pickOpt = (v: string) => {
    const o = field.options?.find((x) => x.value === v);
    return o ? pickText(o.label, o.label_de, locale) : v;
  };
  if (Array.isArray(value)) return value.map(pickOpt).join(", ");
  if (value === undefined || value === null || value === "") return "—";
  return field.type === "select" || field.type === "radio" ? pickOpt(String(value)) : String(value);
}

/** Clamp and normalise a submitted value before it is stored. */
export function cleanValue(field: FormField, value: unknown): AnswerValue {
  if (field.type === "checkbox") return value === true;
  if (field.type === "checkboxes") {
    return Array.isArray(value) ? value.map((x) => String(x).slice(0, 300)).slice(0, 50) : [];
  }
  return String(value ?? "").trim().slice(0, MAX_TEXT);
}

/** Stable id for a new custom field. */
export function newFieldId(existing: FormField[]): string {
  const used = new Set(existing.map((f) => f.id));
  let n = existing.length + 1;
  while (used.has(`q${n}`)) n++;
  return `q${n}`;
}
