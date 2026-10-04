/**
 * Whether an event is currently taking applications.
 *
 * One definition, used by the server (to refuse late submissions), the event
 * page, the home spotlight and the CMS badge, so they can never disagree.
 *
 *  off       the manual "Accept Applications" switch is off
 *  upcoming  an opening date is set and has not been reached
 *  closed    the closing date has passed
 *  full      the applicant cap has been reached
 *  open      accepting applications
 */
export type ApplicationState = "off" | "upcoming" | "closed" | "full" | "open";

export interface ApplicationWindow {
  application_open?: boolean | null;
  application_opens_at?: string | Date | null;
  application_closes_at?: string | Date | null;
  application_max?: number | null;
}

const toMs = (v: string | Date | null | undefined): number | null => {
  if (!v) return null;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
};

export function applicationState(
  ev: ApplicationWindow,
  opts: { now?: number; count?: number } = {}
): ApplicationState {
  if (!ev.application_open) return "off";
  const now = opts.now ?? Date.now();
  const opens = toMs(ev.application_opens_at);
  const closes = toMs(ev.application_closes_at);
  if (closes !== null && now >= closes) return "closed";
  if (opens !== null && now < opens) return "upcoming";
  const max = Number(ev.application_max || 0);
  if (max > 0 && (opts.count ?? 0) >= max) return "full";
  return "open";
}

// ---------------------------------------------------------------------------
// Times are entered and shown in Frankfurt time (Europe/Berlin), whatever the
// editor's or visitor's own time zone is, and stored as UTC.
// ---------------------------------------------------------------------------

const TZ = "Europe/Berlin";

/** UTC offset of Europe/Berlin at the given instant, in minutes. */
function berlinOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** "2026-10-25T23:59" typed as Frankfurt time -> ISO instant (or null). */
export function berlinLocalToISO(local: string): string | null {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  // Two passes settle the offset around daylight-saving changes.
  let t = guess - berlinOffsetMinutes(new Date(guess)) * 60000;
  t = guess - berlinOffsetMinutes(new Date(t)) * 60000;
  return new Date(t).toISOString();
}

/** ISO instant -> "2026-10-25T23:59" in Frankfurt time, for a datetime-local input. */
export function isoToBerlinLocal(iso: string | Date | null | undefined): string {
  const ms = toMs(iso);
  if (ms === null) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }).formatToParts(new Date(ms));
  const g = (t: string) => parts.find((p) => p.type === t)?.value;
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

/** Human date for visitors, e.g. "25 October 2026, 23:59 (Frankfurt time)". */
export function formatBerlin(iso: string | Date | null | undefined, locale: string): string {
  const ms = toMs(iso);
  if (ms === null) return "";
  const text = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    timeZone: TZ,
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(ms));
  return locale === "de" ? `${text} Uhr (Frankfurter Zeit)` : `${text} (Frankfurt time)`;
}

/** Short status text for the CMS list, e.g. "Open · closes in 3 days". */
export function describeState(ev: ApplicationWindow, now = Date.now()): string {
  const s = applicationState(ev, { now });
  if (s === "off") return "Applications off";
  if (s === "closed") return "Closed";
  if (s === "upcoming") return `Opens ${formatBerlin(ev.application_opens_at, "en").replace(/ \(.*\)$/, "")}`;
  const closes = toMs(ev.application_closes_at);
  const cap = Number(ev.application_max || 0) > 0 ? ` · cap ${ev.application_max}` : "";
  if (closes === null) return `Open · no closing date${cap}`;
  const hours = Math.max(0, Math.round((closes - now) / 3600000));
  const left = hours >= 48 ? `${Math.round(hours / 24)} days` : hours >= 1 ? `${hours} hours` : "under an hour";
  return `Open · closes in ${left}${cap}`;
}
