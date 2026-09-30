"use client";

import { adminFetch } from "@/lib/admin-fetch";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * CMS manager for the homepage slideshow (table site_slides).
 *
 * Every action goes to the database first and the list is then re-read from it,
 * so the screen always shows what is stored. Nothing here is a local-only edit.
 */

type Slide = {
  id?: string;
  image_url: string;
  width?: number | null;
  height?: number | null;
  kicker: string;
  location: string;
  tag: string;
  title: string;
  description: string;
  kicker_de?: string | null;
  location_de?: string | null;
  tag_de?: string | null;
  title_de?: string | null;
  description_de?: string | null;
  sort_order?: number;
  active?: boolean;
};

const blank = (): Slide => ({
  image_url: "",
  kicker: "",
  location: "",
  tag: "",
  title: "",
  description: "",
  kicker_de: "",
  location_de: "",
  tag_de: "",
  title_de: "",
  description_de: "",
  active: true,
});

async function prepareImage(file: File): Promise<{ url: string; width: number; height: number }> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  const source = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Could not read the image."));
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not decode the image."));
    el.src = source;
  });
  const scale = Math.min(1, 1800 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL("image/jpeg", 0.82);
  if (url.length > 2_400_000) throw new Error("That photo is still too large after compression. Please use a smaller one.");
  return { url, width: canvas.width, height: canvas.height };
}

export default function SlideshowManager({
  notify: notifyProp,
}: {
  notify: (text: string, type?: "success" | "error") => void;
}) {
  // The parent recreates its toast function on every render; hold it in a ref
  // so loading the list does not re-run (and loop) each time.
  const notifyRef = useRef(notifyProp);
  notifyRef.current = notifyProp;
  const notify = useCallback(
    (text: string, type?: "success" | "error") => notifyRef.current(text, type),
    []
  );
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Slide | null>(null);
  const [lang, setLang] = useState<"en" | "de">("en");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/slides", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(json.data)) throw new Error(json.error || `HTTP ${res.status}`);
      setSlides(json.data);
    } catch (err: any) {
      notify(`Could not load slides: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  async function call(method: string, body?: unknown, query = ""): Promise<boolean> {
    try {
      const res = await adminFetch(`/api/admin/slides${query}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);
      return true;
    } catch (err: any) {
      notify(err.message || "Request failed", "error");
      return false;
    }
  }

  async function save() {
    if (!editing) return;
    if (!editing.image_url) return notify("Add a photo first.", "error");
    if (!editing.title.trim()) return notify("The English title is required.", "error");
    setBusy(true);
    const ok = await call(editing.id ? "PUT" : "POST", editing);
    setBusy(false);
    if (ok) {
      notify(editing.id ? "Slide saved." : "Slide added to the slideshow.");
      setEditing(null);
      await load();
    }
  }

  async function remove(s: Slide) {
    if (!s.id || !confirm(`Delete the slide "${s.title}" permanently?`)) return;
    if (await call("DELETE", undefined, `?id=${encodeURIComponent(s.id)}`)) {
      notify("Slide deleted.");
      await load();
    }
  }

  async function toggle(s: Slide) {
    if (await call("PUT", { id: s.id, active: !s.active })) await load();
  }

  async function move(index: number, dir: -1 | 1) {
    const other = slides[index + dir];
    const cur = slides[index];
    if (!other || !cur.id || !other.id) return;
    // Swap positions; fall back to index-based values if two share a number.
    const a = cur.sort_order ?? index * 10;
    const b = other.sort_order ?? (index + dir) * 10;
    const [na, nb] = a === b ? [index * 10 + dir * 5, index * 10] : [b, a];
    const ok1 = await call("PUT", { id: cur.id, sort_order: na });
    const ok2 = ok1 && (await call("PUT", { id: other.id, sort_order: nb }));
    if (ok2) await load();
  }

  async function onFile(file?: File) {
    if (!file || !editing) return;
    try {
      notify("Preparing photo…");
      const { url, width, height } = await prepareImage(file);
      setEditing({ ...editing, image_url: url, width, height });
      notify("Photo attached. Remember to save the slide.");
    } catch (err: any) {
      notify(err.message || "Upload failed", "error");
    }
  }

  const set = (k: keyof Slide, v: string | boolean) => editing && setEditing({ ...editing, [k]: v });
  const f = (base: string) => (lang === "en" ? base : `${base}_de`) as keyof Slide;
  const val = (base: string) => String((editing?.[f(base)] as string | null | undefined) ?? "");

  return (
    <div className="cms-panel" style={{ padding: "1.5rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid var(--cms-border)",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "1.3rem" }}>Homepage Slideshow</h2>
          <p className="cms-hint" style={{ margin: "4px 0 0" }}>
            The “Real Moments” slideshow on the home page. Add photos, edit the captions in English and German, reorder, hide or delete. Changes go live within a minute.
          </p>
        </div>
        <button className="cms-btn cms-btn-primary" onClick={() => { setLang("en"); setEditing(blank()); }}>
          + Add Slide
        </button>
      </div>

      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--cms-text-muted)" }}>Loading slides…</div>
      ) : slides.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center" }}>
          <p>No slides yet. The slideshow is hidden on the website until you add one.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1.25rem" }}>
          {slides.map((s, i) => (
            <div
              key={s.id}
              className="cms-site-partner-card"
              style={{ flexDirection: "row", alignItems: "center", gap: "1rem", opacity: s.active ? 1 : 0.6 }}
            >
              <span style={{ fontWeight: 800, width: "1.6rem", textAlign: "center" }}>{i + 1}</span>
              <img
                src={s.image_url}
                alt=""
                style={{ width: "120px", height: "76px", objectFit: "cover", borderRadius: "8px", flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--cms-text-muted)" }}>
                  {s.kicker}{s.location ? ` · ${s.location}` : ""}
                </div>
                <h3 style={{ margin: "2px 0 0", fontSize: "1rem" }}>{s.title}</h3>
                <div style={{ fontSize: "0.78rem", color: "var(--cms-text-muted)", marginTop: 2 }}>
                  German: {s.title_de ? "✓" : "— (falls back to English)"}
                </div>
              </div>
              <span className={`cms-pill ${s.active ? "published" : "draft"}`}>{s.active ? "Shown" : "Hidden"}</span>
              <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                <button className="cms-icon-btn" title="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                <button className="cms-icon-btn" title="Move down" disabled={i === slides.length - 1} onClick={() => move(i, 1)}>↓</button>
                <button className="cms-btn cms-btn-secondary" style={{ fontSize: "0.75rem", padding: "6px 10px" }} onClick={() => toggle(s)}>
                  {s.active ? "Hide" : "Show"}
                </button>
                <button className="cms-btn cms-btn-secondary" style={{ fontSize: "0.75rem", padding: "6px 10px" }} onClick={() => { setLang("en"); setEditing({ ...s }); }}>
                  Edit
                </button>
                <button className="cms-icon-btn danger" title="Delete slide" onClick={() => remove(s)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="cms-email-modal-overlay" onClick={() => !busy && setEditing(null)}>
          <div
            className="cms-email-modal-card"
            style={{ maxWidth: "620px", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem" }}>{editing.id ? "Edit slide" : "Add slide"}</h3>
              <button className="cms-icon-btn" onClick={() => setEditing(null)}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="cms-field">
                <label>Photo *</label>
                <div
                  className="cms-image-upload-zone"
                  onClick={() => document.getElementById("slide-photo-file")?.click()}
                  style={{ padding: "1.25rem 1rem" }}
                >
                  <input
                    id="slide-photo-file"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => onFile(e.target.files?.[0])}
                  />
                  <span>📤 Click to upload a photo (compressed automatically)</span>
                </div>
                {editing.image_url && (
                  <img
                    src={editing.image_url}
                    alt="Preview"
                    style={{ width: "100%", maxHeight: "220px", objectFit: "cover", borderRadius: "10px", marginTop: "0.5rem" }}
                  />
                )}
                {!editing.image_url.startsWith("data:") && (
                  <input
                    type="text"
                    placeholder="Or an existing image path, e.g. /assets/abcn/events/..."
                    value={editing.image_url}
                    onChange={(e) => set("image_url", e.target.value)}
                    style={{ marginTop: "0.5rem" }}
                  />
                )}
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                {(["en", "de"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={`cms-btn ${lang === l ? "cms-btn-primary" : "cms-btn-secondary"}`}
                    style={{ fontSize: "0.8rem", padding: "6px 14px" }}
                    onClick={() => setLang(l)}
                  >
                    {l === "en" ? "English" : "Deutsch"}
                  </button>
                ))}
              </div>
              {lang === "de" && (
                <p className="cms-hint" style={{ margin: 0 }}>
                  Leave a German field empty to show the English text to German visitors.
                </p>
              )}

              {([
                ["kicker", "Label (small heading above the title)", "Fireside Session"],
                ["location", "Location / context", "Frankfurt"],
                ["tag", "Tag (pill)", "Leadership & Strategy"],
                ["title", lang === "en" ? "Title *" : "Title", "Candid Conversations on Business & Growth"],
              ] as const).map(([k, label, ph]) => (
                <div className="cms-field" key={k}>
                  <label>{label}</label>
                  <input type="text" placeholder={ph} value={val(k)} onChange={(e) => set(f(k), e.target.value)} />
                </div>
              ))}
              <div className="cms-field">
                <label>Description</label>
                <textarea rows={3} value={val("description")} onChange={(e) => set(f("description"), e.target.value)} />
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
                <input type="checkbox" checked={editing.active !== false} onChange={(e) => set("active", e.target.checked)} />
                Show this slide on the website
              </label>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button className="cms-btn cms-btn-secondary" onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
                <button className="cms-btn cms-btn-primary" onClick={save} disabled={busy}>
                  {busy ? "Saving…" : "Save slide"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
