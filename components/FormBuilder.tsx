"use client";

import { useState } from "react";
import {
  buildDefaultForm,
  CHOICE_TYPES,
  CORE_LABELS,
  FIELD_TYPE_LABELS,
  newFieldId,
  REQUIRED_CORE,
  allFields,
  type ApplicationForm,
  type CoreKey,
  type FieldType,
  type FormField,
  type FormOption,
  type FormStep,
} from "@/lib/application-form";

/**
 * CMS builder for an event's application form.
 *
 * `value === null` means the event uses the default form. "Customize" copies
 * the default into the event, after which everything here is editable. Saving
 * is explicit and goes straight to the database (see onSave).
 */

type Props = {
  value: ApplicationForm | null;
  saved: ApplicationForm | null;
  hasGrants: boolean;
  canSaveNow: boolean;
  saving: boolean;
  onChange: (next: ApplicationForm | null) => void;
  onSave: (next: ApplicationForm | null) => void;
  notify: (text: string, type?: "success" | "error") => void;
};

const TYPES = Object.keys(FIELD_TYPE_LABELS) as FieldType[];
const uid = () => Math.random().toString(36).slice(2, 8);

export function validateFormForSave(form: ApplicationForm): string | null {
  if (!form.steps.length) return "The form needs at least one step.";
  for (const [i, st] of form.steps.entries()) {
    if (!st.title.trim()) return `Step ${i + 1} needs a title.`;
    if (!st.label.trim()) return `Step ${i + 1} needs a short name for the progress bar.`;
    if (!st.fields.length) return `Step ${i + 1} (“${st.title}”) has no questions. Add one or delete the step.`;
    for (const f of st.fields) {
      if (!f.label.trim()) return `A question in step ${i + 1} has no label.`;
      if (CHOICE_TYPES.includes(f.type)) {
        const opts = f.options || [];
        if (!opts.length) return `“${f.label}” needs at least one choice.`;
        if (opts.some((o) => !o.label.trim())) return `“${f.label}” has an empty choice.`;
        const vals = opts.map((o) => (o.value || o.label).trim());
        if (new Set(vals).size !== vals.length) return `“${f.label}” has two choices with the same text.`;
      }
    }
  }
  const cores = new Set(allFields(form).map((f) => f.core));
  for (const k of REQUIRED_CORE) {
    if (!cores.has(k)) return `The form must keep the “${CORE_LABELS[k]}” question.`;
  }
  const ids = allFields(form).map((f) => f.id);
  if (new Set(ids).size !== ids.length) return "Two questions share the same internal id.";
  return null;
}

/** New choices follow their English text until saved, then keep a stable value. */
export function finalizeForm(form: ApplicationForm): ApplicationForm {
  return {
    ...form,
    steps: form.steps.map((st) => ({
      ...st,
      fields: st.fields.map((f) =>
        CHOICE_TYPES.includes(f.type)
          ? { ...f, options: (f.options || []).map((o) => ({ ...o, value: (o.value || o.label).trim() })) }
          : f
      ),
    })),
  };
}

export default function FormBuilder({ value, saved, hasGrants, canSaveNow, saving, onChange, onSave, notify }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const dirty = JSON.stringify(value) !== JSON.stringify(saved);

  const commit = (steps: FormStep[]) => value && onChange({ ...value, steps });
  const patchStep = (si: number, patch: Partial<FormStep>) =>
    value && commit(value.steps.map((s, i) => (i === si ? { ...s, ...patch } : s)));
  const patchField = (si: number, fi: number, patch: Partial<FormField>) =>
    value &&
    commit(
      value.steps.map((s, i) =>
        i === si ? { ...s, fields: s.fields.map((f, j) => (j === fi ? { ...f, ...patch } : f)) } : s
      )
    );

  function swap<T>(arr: T[], a: number, b: number): T[] {
    if (b < 0 || b >= arr.length) return arr;
    const next = [...arr];
    [next[a], next[b]] = [next[b], next[a]];
    return next;
  }

  function addField(si: number, type: FieldType) {
    if (!value) return;
    const f: FormField = {
      id: newFieldId(allFields(value)),
      type,
      label: "",
      required: false,
      width: "full",
      ...(CHOICE_TYPES.includes(type) ? { options: [{ value: "", label: "Option 1" }, { value: "", label: "Option 2" }] } : {}),
    };
    patchStep(si, { fields: [...value.steps[si].fields, f] });
    setOpen(f.id);
  }

  function addCore(si: number, core: CoreKey) {
    if (!value) return;
    // Bring a standard field back from the default form definition.
    const def = allFields(buildDefaultForm(hasGrants)).find((f) => f.core === core);
    if (!def) return;
    patchStep(si, { fields: [...value.steps[si].fields, { ...def }] });
    setOpen(def.id);
  }

  function removeField(si: number, fi: number) {
    if (!value) return;
    const f = value.steps[si].fields[fi];
    if (f.core && REQUIRED_CORE.includes(f.core)) return notify(`“${CORE_LABELS[f.core]}” is needed to identify an applicant and cannot be removed.`, "error");
    if (!confirm(`Remove the question “${f.label || "Untitled"}”?`)) return;
    patchStep(si, { fields: value.steps[si].fields.filter((_, j) => j !== fi) });
  }

  function moveToStep(si: number, fi: number, to: number) {
    if (!value || to === si) return;
    const f = value.steps[si].fields[fi];
    commit(
      value.steps.map((s, i) =>
        i === si ? { ...s, fields: s.fields.filter((_, j) => j !== fi) } : i === to ? { ...s, fields: [...s.fields, f] } : s
      )
    );
  }

  function addStep() {
    if (!value) return;
    commit([
      ...value.steps,
      { id: `step-${uid()}`, label: "New step", title: "New step", subtitle: "", fields: [] },
    ]);
  }

  function removeStep(si: number) {
    if (!value) return;
    const st = value.steps[si];
    if (value.steps.length === 1) return notify("A form needs at least one step.", "error");
    if (st.fields.some((f) => f.core && REQUIRED_CORE.includes(f.core)))
      return notify("This step holds name/email questions that cannot be removed. Move them to another step first.", "error");
    if (!confirm(`Delete the step “${st.title}” and its ${st.fields.length} question(s)?`)) return;
    commit(value.steps.filter((_, i) => i !== si));
  }

  function save() {
    if (!value) return onSave(null);
    const problem = validateFormForSave(value);
    if (problem) return notify(problem, "error");
    const final = finalizeForm(value);
    onChange(final);
    onSave(final);
  }

  const card: React.CSSProperties = {
    border: "1px solid var(--cms-border)",
    borderRadius: "var(--cms-radius-sm, 10px)",
    padding: "1rem",
    background: "rgba(255,255,255,0.03)",
  };
  const row: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" };

  if (!value) {
    return (
      <div className="cms-panel" style={{ ...card, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>This event uses the default application form</h3>
        <p className="cms-hint" style={{ margin: 0 }}>
          Applicants currently see the standard 4-step form (profile, venture, focus, review). To add your own questions,
          change the wording, reorder steps or use other question types for this event, create a custom copy. The default
          form stays as the starting point and other events are not affected.
        </p>
        <div>
          <button className="cms-btn cms-btn-primary" onClick={() => onChange(buildDefaultForm(hasGrants))}>
            Customize this form
          </button>
        </div>
      </div>
    );
  }

  const usedCores = new Set(allFields(value).map((f) => f.core).filter(Boolean));
  const missingCores = (Object.keys(CORE_LABELS) as CoreKey[]).filter((k) => !usedCores.has(k));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ ...card, display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <strong>Custom application form</strong>
          <div className="cms-hint" style={{ marginTop: 4 }}>
            {dirty ? "You have unsaved changes to the form." : "Saved. Applicants see exactly this form."} The privacy consent
            tick box on the final review step is always shown and cannot be edited.
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            className="cms-btn cms-btn-secondary"
            onClick={() => {
              if (confirm("Go back to the default form for this event? Your custom questions will be removed.")) {
                onChange(null);
                if (canSaveNow) onSave(null);
              }
            }}
          >
            Reset to default
          </button>
          <button className="cms-btn cms-btn-primary" disabled={saving || (!dirty && canSaveNow)} onClick={save}>
            {saving ? "Saving…" : canSaveNow ? "Save form" : "Keep (saved with the event)"}
          </button>
        </div>
      </div>

      {value.steps.map((st, si) => (
        <div key={st.id} style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <strong style={{ fontSize: "1rem" }}>Step {si + 1}</strong>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button className="cms-icon-btn" title="Move step up" disabled={si === 0} onClick={() => commit(swap(value.steps, si, si - 1))}>↑</button>
              <button className="cms-icon-btn" title="Move step down" disabled={si === value.steps.length - 1} onClick={() => commit(swap(value.steps, si, si + 1))}>↓</button>
              <button className="cms-icon-btn danger" title="Delete step" onClick={() => removeStep(si)}>✕</button>
            </div>
          </div>

          <div style={row}>
            <div className="cms-field">
              <label>Progress bar name (EN) *</label>
              <input type="text" value={st.label} onChange={(e) => patchStep(si, { label: e.target.value })} />
            </div>
            <div className="cms-field">
              <label>Progress bar name (DE)</label>
              <input type="text" value={st.label_de || ""} onChange={(e) => patchStep(si, { label_de: e.target.value })} />
            </div>
            <div className="cms-field">
              <label>Heading (EN) *</label>
              <input type="text" value={st.title} onChange={(e) => patchStep(si, { title: e.target.value })} />
            </div>
            <div className="cms-field">
              <label>Heading (DE)</label>
              <input type="text" value={st.title_de || ""} onChange={(e) => patchStep(si, { title_de: e.target.value })} />
            </div>
            <div className="cms-field">
              <label>Intro text (EN)</label>
              <input type="text" value={st.subtitle || ""} onChange={(e) => patchStep(si, { subtitle: e.target.value })} />
            </div>
            <div className="cms-field">
              <label>Intro text (DE)</label>
              <input type="text" value={st.subtitle_de || ""} onChange={(e) => patchStep(si, { subtitle_de: e.target.value })} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.75rem" }}>
            {st.fields.length === 0 && <div className="cms-hint">No questions in this step yet.</div>}
            {st.fields.map((f, fi) => {
              const isOpen = open === f.id;
              const locked = Boolean(f.core && REQUIRED_CORE.includes(f.core));
              return (
                <div key={f.id} style={{ border: "1px solid var(--cms-border)", borderRadius: 8, background: "rgba(0,0,0,0.12)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.6rem 0.75rem" }}>
                    <span className="cms-pill draft" style={{ flexShrink: 0 }}>{FIELD_TYPE_LABELS[f.type]}</span>
                    <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => setOpen(isOpen ? null : f.id)}>
                      <span style={{ fontWeight: 600 }}>{f.label || <em style={{ opacity: 0.6 }}>Untitled question</em>}</span>
                      {f.required && <span style={{ color: "#e5484d" }}> *</span>}
                      {f.core && (
                        <span className="cms-hint" style={{ marginLeft: 8, fontSize: "0.72rem" }}>
                          standard field · saved as “{CORE_LABELS[f.core]}”
                        </span>
                      )}
                    </div>
                    <button className="cms-icon-btn" title="Up" disabled={fi === 0} onClick={() => patchStep(si, { fields: swap(st.fields, fi, fi - 1) })}>↑</button>
                    <button className="cms-icon-btn" title="Down" disabled={fi === st.fields.length - 1} onClick={() => patchStep(si, { fields: swap(st.fields, fi, fi + 1) })}>↓</button>
                    <button className="cms-btn cms-btn-secondary" style={{ fontSize: "0.75rem", padding: "4px 10px" }} onClick={() => setOpen(isOpen ? null : f.id)}>
                      {isOpen ? "Close" : "Edit"}
                    </button>
                    <button className="cms-icon-btn danger" title={locked ? "Required to identify applicants" : "Remove question"} disabled={locked} onClick={() => removeField(si, fi)}>✕</button>
                  </div>

                  {isOpen && (
                    <div style={{ padding: "0.75rem", borderTop: "1px solid var(--cms-border)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <div style={row}>
                        <div className="cms-field">
                          <label>Question (EN) *</label>
                          <input type="text" value={f.label} onChange={(e) => patchField(si, fi, { label: e.target.value })} />
                        </div>
                        <div className="cms-field">
                          <label>Question (DE)</label>
                          <input type="text" value={f.label_de || ""} onChange={(e) => patchField(si, fi, { label_de: e.target.value })} />
                        </div>
                        {!["checkbox", "radio", "checkboxes", "select"].includes(f.type) && (
                          <>
                            <div className="cms-field">
                              <label>Placeholder hint (EN)</label>
                              <input type="text" value={f.placeholder || ""} onChange={(e) => patchField(si, fi, { placeholder: e.target.value })} />
                            </div>
                            <div className="cms-field">
                              <label>Placeholder hint (DE)</label>
                              <input type="text" value={f.placeholder_de || ""} onChange={(e) => patchField(si, fi, { placeholder_de: e.target.value })} />
                            </div>
                          </>
                        )}
                        <div className="cms-field">
                          <label>Help text under the field (EN)</label>
                          <input type="text" value={f.help || ""} onChange={(e) => patchField(si, fi, { help: e.target.value })} />
                        </div>
                        <div className="cms-field">
                          <label>Help text under the field (DE)</label>
                          <input type="text" value={f.help_de || ""} onChange={(e) => patchField(si, fi, { help_de: e.target.value })} />
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", alignItems: "flex-end" }}>
                        <div className="cms-field" style={{ minWidth: 180 }}>
                          <label>Question type</label>
                          <select
                            value={f.type}
                            disabled={Boolean(f.core)}
                            onChange={(e) => {
                              const type = e.target.value as FieldType;
                              patchField(si, fi, {
                                type,
                                options: CHOICE_TYPES.includes(type) ? f.options?.length ? f.options : [{ value: "", label: "Option 1" }] : undefined,
                              });
                            }}
                          >
                            {TYPES.map((tp) => (
                              <option key={tp} value={tp}>{FIELD_TYPE_LABELS[tp]}</option>
                            ))}
                          </select>
                        </div>
                        <div className="cms-field" style={{ minWidth: 140 }}>
                          <label>Width</label>
                          <select value={f.width || "full"} onChange={(e) => patchField(si, fi, { width: e.target.value as "half" | "full" })}>
                            <option value="full">Full width</option>
                            <option value="half">Half width</option>
                          </select>
                        </div>
                        {["text", "textarea"].includes(f.type) && (
                          <div className="cms-field" style={{ width: 130 }}>
                            <label>Minimum length</label>
                            <input type="number" min={0} value={f.minLength ?? 0} onChange={(e) => patchField(si, fi, { minLength: Number(e.target.value) || undefined })} />
                          </div>
                        )}
                        {value.steps.length > 1 && (
                          <div className="cms-field" style={{ minWidth: 160 }}>
                            <label>Move to step</label>
                            <select value={si} onChange={(e) => moveToStep(si, fi, Number(e.target.value))}>
                              {value.steps.map((s, i) => (
                                <option key={s.id} value={i}>Step {i + 1}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <label style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 8 }}>
                          <input
                            type="checkbox"
                            checked={Boolean(f.required)}
                            disabled={locked}
                            onChange={(e) => patchField(si, fi, { required: e.target.checked })}
                          />
                          Required{locked ? " (always)" : ""}
                        </label>
                      </div>

                      {CHOICE_TYPES.includes(f.type) && (
                        <div>
                          <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Choices</label>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                            {(f.options || []).map((o, oi) => (
                              <div key={oi} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto auto", gap: 6, alignItems: "center" }}>
                                <input
                                  type="text"
                                  placeholder="English"
                                  value={o.label}
                                  onChange={(e) => {
                                    const opts: FormOption[] = [...(f.options || [])];
                                    opts[oi] = { ...o, label: e.target.value };
                                    patchField(si, fi, { options: opts });
                                  }}
                                />
                                <input
                                  type="text"
                                  placeholder="Deutsch (optional)"
                                  value={o.label_de || ""}
                                  onChange={(e) => {
                                    const opts: FormOption[] = [...(f.options || [])];
                                    opts[oi] = { ...o, label_de: e.target.value };
                                    patchField(si, fi, { options: opts });
                                  }}
                                />
                                <button className="cms-icon-btn" disabled={oi === 0} onClick={() => patchField(si, fi, { options: swap(f.options || [], oi, oi - 1) })}>↑</button>
                                <button className="cms-icon-btn" disabled={oi === (f.options || []).length - 1} onClick={() => patchField(si, fi, { options: swap(f.options || [], oi, oi + 1) })}>↓</button>
                                <button className="cms-icon-btn danger" onClick={() => patchField(si, fi, { options: (f.options || []).filter((_, k) => k !== oi) })}>✕</button>
                              </div>
                            ))}
                            <div>
                              <button
                                className="cms-btn cms-btn-secondary"
                                style={{ fontSize: "0.75rem", padding: "4px 10px" }}
                                onClick={() => patchField(si, fi, { options: [...(f.options || []), { value: "", label: "" }] })}
                              >
                                + Add choice
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) addField(si, e.target.value as FieldType);
                e.target.value = "";
              }}
              style={{ maxWidth: 240 }}
            >
              <option value="">+ Add a question…</option>
              {TYPES.map((tp) => (
                <option key={tp} value={tp}>{FIELD_TYPE_LABELS[tp]}</option>
              ))}
            </select>
            {missingCores.length > 0 && (
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) addCore(si, e.target.value as CoreKey);
                  e.target.value = "";
                }}
                style={{ maxWidth: 260 }}
              >
                <option value="">+ Restore a standard field…</option>
                {missingCores.map((k) => (
                  <option key={k} value={k}>{CORE_LABELS[k]}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      ))}

      <div>
        <button className="cms-btn cms-btn-secondary" onClick={addStep}>+ Add step</button>
      </div>
    </div>
  );
}
