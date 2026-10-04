"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { berlinLocalToISO, describeState, formatBerlin, isoToBerlinLocal } from "@/lib/application-status";

/**
 * CMS controls for an event's application window beyond the plain schedule:
 * quick extensions, a manual override (force open / force closed), private
 * access links, and the history of who changed what. Every action goes to the
 * database through /api/admin/application-window and is logged there.
 */

type WindowEvent = {
  application_open?: boolean | null;
  application_override?: string | null;
  application_opens_at?: string | null;
  application_closes_at?: string | null;
  application_max?: number | null;
};
type LogRow = { id: string; action: string; detail: any; note: string | null; actor: string | null; created_at: string };
type LinkRow = { id: string; token: string; label: string; expires_at: string | null; max_uses: number | null; uses: number; revoked: boolean; created_at: string };

const fmt = (iso: string | null | undefined) => (iso ? formatBerlin(iso, "en").replace(/ \(Frankfurt time\)$/, "") : "none");

function describeLog(r: LogRow): string {
  const d = r.detail || {};
  switch (r.action) {
    case "extend":
    case "set_window":
      return `${r.action === "extend" ? "Extended" : "Changed"} closing time: ${fmt(d.from)} → ${fmt(d.to)}`;
    case "override":
      return `Override: ${d.from || "automatic"} → ${d.to || "automatic"}`;
    case "link_created":
      return `Created access link “${d.label || "untitled"}”${d.maxUses ? ` (max ${d.maxUses} uses)` : ""}${d.expires ? `, expires ${fmt(d.expires)}` : ""}`;
    case "link_revoked":
      return `Revoked access link “${d.label || "untitled"}”`;
    default:
      return r.action;
  }
}

export default function ApplicationWindowPanel({
  eventId,
  slug,
  notify,
  onWindowChanged,
}: {
  eventId: string;
  slug: string;
  notify: (text: string, type?: "success" | "error") => void;
  /** Fresh window fields from the database, so the event form never holds stale ones. */
  onWindowChanged: (ev: WindowEvent) => void;
}) {
  const notifyRef = useRef(notify);
  notifyRef.current = notify;
  const changedRef = useRef(onWindowChanged);
  changedRef.current = onWindowChanged;

  const [ev, setEv] = useState<WindowEvent | null>(null);
  const [log, setLog] = useState<LogRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [count, setCount] = useState(0);
  const [note, setNote] = useState("");
  const [exact, setExact] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [linkExpires, setLinkExpires] = useState("");
  const [linkMax, setLinkMax] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await adminFetch(`/api/admin/application-window?eventId=${encodeURIComponent(eventId)}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);
      setEv(json.event);
      setLog(json.log);
      setLinks(json.links);
      setCount(json.applications);
      changedRef.current(json.event);
    } catch (err: any) {
      notifyRef.current(`Could not load the application window: ${err.message}`, "error");
    }
  }, [eventId]);

  useEffect(() => {
    setEv(null);
    load();
  }, [load]);

  async function act(body: Record<string, unknown>, done: string): Promise<boolean> {
    setBusy(true);
    try {
      const res = await adminFetch("/api/admin/application-window", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, note, ...body }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);
      notifyRef.current(done);
      setNote("");
      await load();
      return true;
    } catch (err: any) {
      notifyRef.current(err.message || "Request failed", "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const linkUrl = (token: string, de = false) =>
    `${origin}${de ? "/de/veranstaltungen/" : "/events/"}${slug}?access=${token}`;

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      notify("Link copied.");
    } catch {
      window.prompt("Copy this link:", text);
    }
  }

  const card: React.CSSProperties = { border: "1px solid var(--cms-border)", borderRadius: 10, padding: "1rem", background: "rgba(255,255,255,0.03)" };
  const btn = { fontSize: "0.78rem", padding: "6px 12px" } as const;

  if (!ev) return <div className="cms-hint">Loading application window…</div>;

  const mode = ev.application_override === "open" || ev.application_override === "closed" ? ev.application_override : "auto";
  const modes: { id: "auto" | "open" | "closed"; title: string; text: string }[] = [
    { id: "auto", title: "Automatic", text: "Follow the schedule, the applicant cap and the Accept Applications switch." },
    { id: "open", title: "Force open", text: "Accept applications regardless of the closing time or the cap, until you switch back." },
    { id: "closed", title: "Force closed", text: "Refuse applications now, regardless of the schedule. Private links stop working too." },
  ];

  return (
    <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={card}>
        <strong>Live status: {describeState(ev)}</strong>
        <div className="cms-hint" style={{ marginTop: 4 }}>
          {count} application{count === 1 ? "" : "s"} received
          {ev.application_max ? ` of ${ev.application_max} allowed` : ""}
          {ev.application_closes_at ? ` · closes ${formatBerlin(ev.application_closes_at, "en")}` : " · no closing time set"}
        </div>
        <div className="cms-field" style={{ marginTop: 10 }}>
          <label>Reason for the next change (optional, saved in the history)</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Extended after partner request" />
        </div>
      </div>

      <div style={card}>
        <strong>Extend the deadline</strong>
        <div className="cms-hint" style={{ margin: "4px 0 10px" }}>
          Adds time to the current closing time (or to now, if it has already passed). This also reopens an event that
          closed by schedule.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {[1, 3, 7, 14].map((d) => (
            <button key={d} className="cms-btn cms-btn-secondary" style={btn} disabled={busy} onClick={() => act({ action: "extend", addDays: d }, `Deadline extended by ${d} day${d > 1 ? "s" : ""}.`)}>
              + {d === 7 ? "1 week" : d === 14 ? "2 weeks" : `${d} day${d > 1 ? "s" : ""}`}
            </button>
          ))}
          <span className="cms-hint">or set exactly (Frankfurt time):</span>
          <input type="datetime-local" value={exact} onChange={(e) => setExact(e.target.value)} style={{ maxWidth: 220 }} />
          <button
            className="cms-btn cms-btn-primary"
            style={btn}
            disabled={busy || !exact}
            onClick={async () => {
              if (await act({ action: "extend", closesAt: berlinLocalToISO(exact) }, "Closing time updated.")) setExact("");
            }}
          >
            Set
          </button>
        </div>
      </div>

      <div style={card}>
        <strong>Manual override</strong>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10, marginTop: 10 }}>
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={busy || mode === m.id}
              onClick={() => {
                if (m.id !== "auto" && !confirm(`${m.title}: ${m.text}\n\nContinue?`)) return;
                act({ action: "override", mode: m.id === "auto" ? null : m.id }, `Override set to “${m.title}”.`);
              }}
              style={{
                textAlign: "left",
                padding: "0.75rem",
                borderRadius: 8,
                cursor: mode === m.id ? "default" : "pointer",
                border: mode === m.id ? "2px solid var(--cms-accent, #5f8fc0)" : "1px solid var(--cms-border)",
                background: mode === m.id ? "rgba(95,143,192,0.12)" : "transparent",
                color: "inherit",
              }}
            >
              <strong>{m.title}{mode === m.id ? " ✓" : ""}</strong>
              <div className="cms-hint" style={{ marginTop: 4 }}>{m.text}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={card}>
        <strong>Private access links</strong>
        <div className="cms-hint" style={{ margin: "4px 0 10px" }}>
          A link lets specific people apply after the window has closed, before it opens, or when the cap is full.
          Share it only with those people. It does not work if you force the event closed or switch applications off.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="cms-field" style={{ minWidth: 180 }}>
            <label>Label</label>
            <input type="text" placeholder="e.g. Late partner nominees" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} />
          </div>
          <div className="cms-field">
            <label>Expires (Frankfurt time, optional)</label>
            <input type="datetime-local" value={linkExpires} onChange={(e) => setLinkExpires(e.target.value)} />
          </div>
          <div className="cms-field" style={{ width: 120 }}>
            <label>Max uses</label>
            <input type="number" min={1} placeholder="no limit" value={linkMax} onChange={(e) => setLinkMax(e.target.value)} />
          </div>
          <button
            className="cms-btn cms-btn-primary"
            style={{ ...btn, marginBottom: 8 }}
            disabled={busy}
            onClick={async () => {
              if (await act({ action: "createLink", label: linkLabel, expiresAt: linkExpires ? berlinLocalToISO(linkExpires) : null, maxUses: linkMax ? Number(linkMax) : null }, "Access link created.")) {
                setLinkLabel("");
                setLinkExpires("");
                setLinkMax("");
              }
            }}
          >
            Create link
          </button>
        </div>

        {links.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {links.map((l) => {
              const expired = l.expires_at && new Date(l.expires_at).getTime() <= Date.now();
              const used = l.max_uses !== null && l.uses >= l.max_uses;
              const dead = l.revoked || expired || used;
              return (
                <div key={l.id} style={{ border: "1px solid var(--cms-border)", borderRadius: 8, padding: "0.6rem 0.75rem", opacity: dead ? 0.6 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <div>
                      <strong>{l.label || "Untitled link"}</strong>{" "}
                      <span className={`cms-pill ${dead ? "draft" : "published"}`}>
                        {l.revoked ? "Revoked" : expired ? "Expired" : used ? "Used up" : "Active"}
                      </span>
                      <div className="cms-hint">
                        Used {l.uses}{l.max_uses ? ` of ${l.max_uses}` : ""} · expires {l.expires_at ? fmt(l.expires_at) : "never"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {!dead && (
                        <>
                          <button className="cms-btn cms-btn-secondary" style={btn} onClick={() => copy(linkUrl(l.token))}>Copy EN link</button>
                          <button className="cms-btn cms-btn-secondary" style={btn} onClick={() => copy(linkUrl(l.token, true))}>Copy DE link</button>
                          <button
                            className="cms-icon-btn danger"
                            title="Revoke link"
                            disabled={busy}
                            onClick={() => confirm(`Revoke “${l.label || "this link"}”? It stops working immediately.`) && act({ action: "revokeLink", linkId: l.id }, "Link revoked.")}
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={card}>
        <strong>History</strong>
        {log.length === 0 ? (
          <div className="cms-hint" style={{ marginTop: 6 }}>No changes recorded yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {log.map((r) => (
              <div key={r.id} style={{ fontSize: "0.85rem" }}>
                <span className="cms-hint">{formatBerlin(r.created_at, "en").replace(/ \(Frankfurt time\)$/, "")} · {r.actor || "admin"}</span>
                <div>{describeLog(r)}{r.note ? <em className="cms-hint"> — “{r.note}”</em> : null}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { isoToBerlinLocal };
