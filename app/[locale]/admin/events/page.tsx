"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/routing";
import { neon } from "@/lib/neon";
import {
  EventRecord,
  EventStage,
  EventPartner,
  EventGalleryItem,
  FIALI_FALLBACK,
  normaliseEvent,
} from "@/lib/events";
import "@/app/[locale]/admin/admin.css";
import SlideshowManager from "@/components/SlideshowManager";

type Mode = "checking" | "signed-out" | "needs-admin" | "admin";
type MainTab = "events" | "pipeline" | "partners" | "slideshow" | "media";
type EditorTab = "core" | "location" | "content" | "media" | "stages" | "partners" | "german" | "applicants";
type Editable = EventRecord & { id?: string };
type AdminTheme = "dark" | "light";

export type SitePartner = {
  id?: string;
  name: string;
  logo_url?: string;
  website_url?: string;
  category?: string;
  description?: string;
  tier?: number;
  priority?: number;
  active?: boolean;
};

type ApplicationRow = {
  id: string;
  event_id?: string | null;
  event_title?: string | null;
  first_name: string;
  last_name: string;
  role_title?: string | null;
  email: string;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  company_name?: string | null;
  company_website?: string | null;
  business_model?: string | null;
  venture_stage?: string | null;
  ai_interest?: string | null;
  motivation?: string | null;
  goals?: string | null;
  referral_source?: string | null;
  status: string;
  admin_notes?: string | null;
  submitted_at: string;
};

const SECTIONS: { id: EditorTab; label: string; shortLabel: string; num: string }[] = [
  { id: "core", label: "Core & Publishing", shortLabel: "Core", num: "01" },
  { id: "location", label: "Date & Location", shortLabel: "Schedule", num: "02" },
  { id: "content", label: "Narrative & Editorial", shortLabel: "Editorial", num: "03" },
  { id: "media", label: "Media, Card & Atmosphere Gallery", shortLabel: "Media & Gallery", num: "04" },
  { id: "stages", label: "Programme Stages & Grants", shortLabel: "Stages", num: "05" },
  { id: "partners", label: "Partners & Logo Manager", shortLabel: "Partners", num: "06" },
  { id: "german", label: "German Translation", shortLabel: "German (DE)", num: "07" },
  { id: "applicants", label: "Event Applicants", shortLabel: "Applicants", num: "08" },
];

const blankEvent = (): Editable => ({
  slug: "",
  title: "",
  eyebrow: "",
  short_description: "",
  description: "",
  long_description: "",
  city: "Frankfurt am Main",
  country: "Germany",
  venue: "",
  date_label: "",
  start_at: null,
  end_at: null,
  status: "draft",
  event_type: "Summit",
  organizer: "ABCN · Afropean Business & Culture Network",
  hero_image_url: "",
  card_image_url: "",
  registration_url: "",
  featured: false,
  priority: 50,
  show_on_home: false,
  theme: "",
  accent_color: "#58AC8C",
  deep_color: "#0F4C38",
  light_color: "#F1F5FA",
  title_de: "",
  eyebrow_de: "",
  short_description_de: "",
  description_de: "",
  long_description_de: "",
  date_label_de: "",
  venue_de: "",
  application_cta_de: "",
  application_deadline_de: "",
  highlights_de: [],
  stages_de: [],
  eligibility_de: [],
  grants_de: {},
  focus_areas_de: [],
  benefits_de: [],
  highlights: [],
  stages: [],
  eligibility: [],
  partners: [],
  grants: {},
  gallery: [],
  application_open: false,
  application_deadline: "",
  application_cta: "Apply now",
  focus_areas: [],
  benefits: [],
});

const lines = (value: string) =>
  value
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);

const partnersFromText = (value: string): EventPartner[] =>
  lines(value).map((row) => {
    const [name, logo, website] = row.split("|").map((v) => v.trim());
    return { name, ...(logo ? { logo } : {}), ...(website ? { website } : {}) };
  });

const cardsFromText = (value: string) =>
  lines(value).map((row) => {
    const [title, ...rest] = row.split("|");
    return { title: title.trim(), description: rest.join("|").trim() };
  });

async function compressImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not decode image."));
    el.src = source;
  });
  const max = 1600;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const out = canvas.toDataURL("image/jpeg", 0.82);
  if (out.length > 1_700_000)
    throw new Error("Image is still too large. Please use an image under about 1.2 MB.");
  return out;
}

export default function EventsAdminPage() {
  const [mode, setMode] = useState<Mode>("checking");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mainTab, setMainTab] = useState<MainTab>("events");
  const [editorTab, setEditorTab] = useState<EditorTab>("core");

  const [events, setEvents] = useState<Editable[]>([]);
  const [form, setForm] = useState<Editable>(blankEvent());
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [eventsSearch, setEventsSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [claimToken, setClaimToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Application Pipeline State
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [allApplications, setAllApplications] = useState<ApplicationRow[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [pipelineEventFilter, setPipelineEventFilter] = useState<string>("all");
  const [pipelineStatusFilter, setPipelineStatusFilter] = useState<string>("all");
  const [pipelineSearch, setPipelineSearch] = useState("");
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicationRow | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Admin Theme State (Dark / Light)
  const [adminTheme, setAdminTheme] = useState<AdminTheme>("dark");
  const [loadingDuration, setLoadingDuration] = useState(0);

  // Website Partners State (Global Site Partners)
  const [sitePartners, setSitePartners] = useState<SitePartner[]>([]);
  const [sitePartnersLoading, setSitePartnersLoading] = useState(false);
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [partnerForm, setPartnerForm] = useState<SitePartner>({
    name: "",
    logo_url: "",
    website_url: "",
    category: "Strategic Partner",
    description: "",
    priority: 10,
    active: true,
  });

  // Media Library state
  const [copiedAsset, setCopiedAsset] = useState<string | null>(null);
  const [mediaUploadPreview, setMediaUploadPreview] = useState<string | null>(null);

  // Deletion Confirm Modal State
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [rawJsonMode, setRawJsonMode] = useState(false);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? (localStorage.getItem("abcn-admin-theme") as AdminTheme | null) : null;
    if (saved === "light" || saved === "dark") {
      setAdminTheme(saved);
    }
  }, []);

  useEffect(() => {
    if (mode !== "checking") {
      setLoadingDuration(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingDuration((d) => d + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [mode]);

  function toggleAdminTheme(t: AdminTheme) {
    setAdminTheme(t);
    if (typeof window !== "undefined") {
      localStorage.setItem("abcn-admin-theme", t);
    }
  }

  const stagesText = useMemo(() => JSON.stringify(form.stages || [], null, 2), [form.stages]);
  const grantsText = useMemo(() => JSON.stringify(form.grants || {}, null, 2), [form.grants]);
  const partnersText = useMemo(
    () =>
      (form.partners || [])
        .map((p) => [p.name, p.logo || "", p.website || ""].join(" | "))
        .join("\n"),
    [form.partners]
  );
  const focusText = useMemo(
    () => (form.focus_areas || []).map((p) => [p.title, p.description].join(" | ")).join("\n"),
    [form.focus_areas]
  );
  const benefitsText = useMemo(
    () => (form.benefits || []).map((p) => [p.title, p.description].join(" | ")).join("\n"),
    [form.benefits]
  );

  function showToast(text: string, type: "success" | "error" = "success") {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  }

  // Resilient session loader with timeout protection
  async function refreshSession() {
    try {
      // Race session check against a 3.8s timeout so the UI never hangs indefinitely
      const sessionPromise = neon.auth.getSession();
      const timeoutPromise = new Promise<{ data: null }>((resolve) =>
        setTimeout(() => resolve({ data: null }), 3800)
      );
      const { data } = await Promise.race([sessionPromise, timeoutPromise]);
      const user = (data as any)?.user || (data as any)?.session?.user;
      if (!user) {
        setMode("signed-out");
        return;
      }
      setCurrentUser(user);
      const role = String(user.role || "");
      if (role.includes("admin")) {
        setMode("admin");
        await Promise.all([loadEvents(), loadAllApplications(), loadSitePartners()]);
      } else {
        setMode("needs-admin");
      }
    } catch {
      setMode("signed-out");
    }
  }

  // The CMS must show what is stored, not what the public site would fall back
  // to. normaliseEvent pads a row with seeded defaults for display; for the
  // lists an editor deletes from (partners, gallery) the stored value is used
  // as-is so a deletion is visible, and saved, exactly as made.
  function toFormRow(r: any): EventRecord {
    const base = normaliseEvent(r);
    const list = (v: any) => (Array.isArray(v) ? v : []);
    return {
      ...base,
      partners: list(r.partners).map((p: any) => ({
        name: p?.name || "",
        logo: p?.logo || p?.logo_url || "",
        website: p?.website || p?.website_url || "",
        tier: p?.tier || undefined,
        tagline: p?.tagline || undefined,
      })),
      gallery: list(r.gallery),
    };
  }

  // Events loader: reads the database through the internal API. The old
  // PostgREST fallback is gone; it could show a stale or seeded copy that then
  // got saved back over the real data.
  async function loadEvents() {
    try {
      const res = await fetch("/api/admin/events", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          const rows = json.data.map((r: any) => toFormRow(r));
          setEvents(rows);
          if (rows.length && !selectedId) {
            setSelectedId(rows[0].id);
            setForm({ ...rows[0] });
            loadEventApplications(rows[0].id);
          }
          return;
        }
      }
    } catch {
      // Reported below.
    }

    showToast("Could not load events from the database. Reload the page to retry.", "error");
  }

  // Resilient applications loader
  async function loadAllApplications() {
    setApplicationsLoading(true);
    try {
      const res = await fetch("/api/admin/applications");
      if (res.ok) {
        const json = await res.json();
        setAllApplications((json.data || []) as ApplicationRow[]);
      }
    } catch {
      // Silent failover
    } finally {
      setApplicationsLoading(false);
    }
  }

  async function loadEventApplications(eventId?: string) {
    if (!eventId) {
      setApplications([]);
      return;
    }
    setApplicationsLoading(true);
    try {
      const res = await fetch(`/api/admin/applications?eventId=${encodeURIComponent(eventId)}`);
      if (res.ok) {
        const json = await res.json();
        setApplications((json.data || []) as ApplicationRow[]);
      } else {
        const { data } = await neon
          .from("event_applications")
          .select("*")
          .eq("event_id", eventId)
          .order("submitted_at", { ascending: false });
        setApplications((data || []) as ApplicationRow[]);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load event applications", "error");
    } finally {
      setApplicationsLoading(false);
    }
  }

  useEffect(() => {
    refreshSession().catch(() => setMode("signed-out"));
  }, []);

  async function signIn(e: FormEvent) {
    e.preventDefault();
    try {
      const res = await neon.auth.signIn.email({
        email: authForm.email,
        password: authForm.password,
      });
      if (res?.error) {
        showToast(res.error.message || "Invalid email or password.", "error");
        return;
      }
      showToast("Signed in successfully.");
      await refreshSession();
    } catch (err: any) {
      console.error("Sign-in exception:", err);
      showToast(err?.message || "Invalid email or password. Please verify your credentials.", "error");
    }
  }

  async function signUp() {
    try {
      const res = await neon.auth.signUp.email({
        name: authForm.name || "ABCN Admin",
        email: authForm.email,
        password: authForm.password,
      });
      if (res?.error) {
        showToast(res.error.message || "Could not create account.", "error");
        return;
      }
      showToast("Account created. Welcome to ABCN CMS.");
      await refreshSession();
    } catch (err: any) {
      console.error("Sign-up exception:", err);
      showToast(err?.message || "Could not create account.", "error");
    }
  }

  async function claimAdmin() {
    try {
      const { data, error: rpcError } = await neon.rpc("claim_cms_admin", { p_token: claimToken });
      if (rpcError || !data) {
        showToast(rpcError?.message || "Invalid setup token.", "error");
        return;
      }
      showToast("Administrator role assigned! Refreshing session...");
      await refreshSession();
    } catch (err: any) {
      console.error("Claim admin exception:", err);
      showToast(err?.message || "Invalid setup token.", "error");
    }
  }

  async function signOut() {
    await neon.auth.signOut();
    setMode("signed-out");
    setEvents([]);
    setForm(blankEvent());
    showToast("Signed out.");
  }

  // Event Selection & CRUD
  function selectEvent(event: Editable) {
    setSelectedId(event.id);
    setForm({ ...event });
    loadEventApplications(event.id);
  }

  function newEvent() {
    setSelectedId(undefined);
    setForm(blankEvent());
    setApplications([]);
    setEditorTab("core");
    showToast("Ready to draft a new event.");
  }

  function duplicateCurrentEvent() {
    if (!form.title) return;
    const clone: Editable = {
      ...form,
      id: undefined,
      title: `${form.title} (Copy)`,
      slug: `${form.slug || "event"}-copy-${Math.floor(1000 + Math.random() * 9000)}`,
      status: "draft",
      featured: false,
      show_on_home: false,
    };
    setForm(clone);
    setSelectedId(undefined);
    setApplications([]);
    setEditorTab("core");
    showToast(`Created duplicate draft of "${form.title}". Click Save to publish.`);
  }

  function update<K extends keyof Editable>(key: K, value: Editable[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function generateSlug() {
    if (!form.title) return;
    const generated = form.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    update("slug", generated);
    showToast(`Slug updated to "${generated}"`);
  }

  async function saveEvent() {
    setSaving(true);
    try {
      if (!form.title.trim() || !form.slug.trim()) {
        throw new Error("Title and slug are required.");
      }

      const payload = { ...form };
      delete payload.id;

      let savedItem: any = null;

      // One write path, and it must succeed: a failed request is an error,
      // never a "saved" toast. (A silent second path used to swallow failures,
      // which is why deletions appeared to work but never reached the database.)
      const res = await fetch("/api/admin/events", {
        method: selectedId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedId ? { id: selectedId, ...payload } : payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.data) {
        throw new Error(json.error || `Save failed (HTTP ${res.status}). Nothing was written to the database.`);
      }
      savedItem = json.data;

      if (!selectedId && savedItem?.id) {
        setSelectedId(savedItem.id);
      }
      showToast(selectedId ? "Event saved to the database." : "New event created.");

      await loadEvents();
    } catch (err: any) {
      showToast(err.message || "Could not save event.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function confirmAndRemoveEvent() {
    if (!selectedId) return;
    try {
      const res = await fetch(`/api/admin/events?id=${encodeURIComponent(selectedId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Delete failed (HTTP ${res.status}). The event was not removed.`);
      }
      setConfirmDeleteId(null);
      newEvent();
      showToast("Event deleted permanently.");
      await loadEvents();
    } catch (err: any) {
      showToast(err.message || "Could not delete event", "error");
    }
  }

  // Quick Status Toggle on Event
  async function quickSetEventStatus(eventId: string, newStatus: Editable["status"]) {
    try {
      const res = await fetch("/api/admin/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: eventId, status: newStatus }),
      });
      if (res.ok) {
        setEvents((prev) =>
          prev.map((e) => (e.id === eventId ? { ...e, status: newStatus } : e))
        );
        if (selectedId === eventId) {
          setForm((prev) => ({ ...prev, status: newStatus }));
        }
        showToast(`Event status updated to ${newStatus}.`);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to update status", "error");
    }
  }

  // Application Pipeline Status & Notes Update
  async function updateApplicationStatus(id: string, status: string, notes?: string) {
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, ...(notes !== undefined ? { admin_notes: notes } : {}) }),
      });

      if (!res.ok) {
        await neon.from("event_applications").update({ status }).eq("id", id);
      }

      setApplications((rows) =>
        rows.map((row) => (row.id === id ? { ...row, status, ...(notes !== undefined ? { admin_notes: notes } : {}) } : row))
      );
      setAllApplications((rows) =>
        rows.map((row) => (row.id === id ? { ...row, status, ...(notes !== undefined ? { admin_notes: notes } : {}) } : row))
      );
      if (selectedApplicant?.id === id) {
        setSelectedApplicant((prev) =>
          prev ? { ...prev, status, ...(notes !== undefined ? { admin_notes: notes } : {}) } : null
        );
      }
      showToast(`Applicant status updated to ${status}.`);
    } catch (err: any) {
      showToast(err.message || "Could not update status", "error");
    }
  }

  async function deleteApplication(id: string) {
    if (!confirm("Permanently delete this founder application?")) return;
    try {
      const res = await fetch(`/api/admin/applications?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        await neon.from("event_applications").delete().eq("id", id);
      }
      setApplications((rows) => rows.filter((r) => r.id !== id));
      setAllApplications((rows) => rows.filter((r) => r.id !== id));
      if (selectedApplicant?.id === id) setSelectedApplicant(null);
      showToast("Application deleted.");
    } catch (err: any) {
      showToast(err.message || "Could not delete application", "error");
    }
  }

  // Export CSV Helper
  function exportApplicantsCSV(list: ApplicationRow[], filenamePrefix = "abcn-applicants") {
    if (!list.length) {
      showToast("No applicants to export.", "error");
      return;
    }
    const headers = [
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Role",
      "Company",
      "Stage",
      "City",
      "Country",
      "Status",
      "Submitted Date",
      "Motivation",
      "Admin Notes",
    ];
    const rows = list.map((a) => [
      `"${(a.first_name || "").replace(/"/g, '""')}"`,
      `"${(a.last_name || "").replace(/"/g, '""')}"`,
      `"${(a.email || "").replace(/"/g, '""')}"`,
      `"${(a.phone || "").replace(/"/g, '""')}"`,
      `"${(a.role_title || "").replace(/"/g, '""')}"`,
      `"${(a.company_name || "").replace(/"/g, '""')}"`,
      `"${(a.venture_stage || "").replace(/"/g, '""')}"`,
      `"${(a.city || "").replace(/"/g, '""')}"`,
      `"${(a.country || "").replace(/"/g, '""')}"`,
      `"${(a.status || "").replace(/"/g, '""')}"`,
      `"${new Date(a.submitted_at).toISOString()}"`,
      `"${(a.motivation || "").replace(/"/g, '""')}"`,
      `"${(a.admin_notes || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    showToast(`Exported ${list.length} applicants to CSV spreadsheet.`);
  }

  // Copy Email List Helper
  function copyEmailList(list: ApplicationRow[], format: "comma" | "named" | "newline" = "comma") {
    if (!list.length) {
      showToast("No applicants in current filter.", "error");
      return;
    }
    let text = "";
    if (format === "named") {
      text = list.map((a) => `"${a.first_name} ${a.last_name}" <${a.email}>`).join(", ");
    } else if (format === "newline") {
      text = list.map((a) => a.email).join("\n");
    } else {
      text = list.map((a) => a.email).join(", ");
    }
    navigator.clipboard.writeText(text);
    showToast(`Copied ${list.length} email addresses to clipboard!`);
    setShowEmailModal(false);
  }

  // Trigger group mailto
  function openGroupEmail(list: ApplicationRow[]) {
    if (!list.length) {
      showToast("No applicants to email.", "error");
      return;
    }
    const bcc = list.map((a) => a.email).join(",");
    const subject = encodeURIComponent("ABCN Innovation & Leadership Programme Update");
    window.open(`mailto:contact@afropeanbusiness.com?bcc=${bcc}&subject=${subject}`, "_blank");
  }

  async function handleImage(file?: File) {
    if (!file) return;
    try {
      showToast("Compressing and preparing image...");
      const compressed = await compressImage(file);
      update("hero_image_url", compressed);
      showToast("Hero image uploaded & ready to save to database.");
    } catch (err: any) {
      showToast(err.message || "Failed to process image", "error");
    }
  }

  async function handleCardImage(file?: File) {
    if (!file) return;
    try {
      showToast("Compressing and preparing card thumbnail...");
      const compressed = await compressImage(file);
      update("card_image_url", compressed);
      showToast("Card thumbnail uploaded & ready to save to database.");
    } catch (err: any) {
      showToast(err.message || "Failed to process thumbnail", "error");
    }
  }

  // Global Website Partners Handlers
  async function loadSitePartners() {
    setSitePartnersLoading(true);
    try {
      const res = await fetch("/api/admin/partners", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(json.data)) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setSitePartners(json.data);
    } catch {
      showToast("Failed to load website partners", "error");
    } finally {
      setSitePartnersLoading(false);
    }
  }

  async function saveSitePartner(partner: SitePartner) {
    try {
      const isNew = !partner.id;
      const res = await fetch("/api/admin/partners", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partner),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Save failed");
      showToast(isNew ? "Website partner created!" : "Website partner updated!");
      setPartnerModalOpen(false);
      await loadSitePartners();
    } catch (err: any) {
      showToast(err.message || "Failed to save partner", "error");
    }
  }

  async function deleteSitePartner(id: string) {
    if (!confirm("Permanently delete this website partner?")) return;
    try {
      const res = await fetch(`/api/admin/partners?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      // 404 means it is already gone from the database, which is what was asked.
      if (res.status !== 404 && (!res.ok || !json.success)) throw new Error(json.error || "Delete failed");
      showToast("Website partner deleted from the database.");
      await loadSitePartners();
    } catch (err: any) {
      showToast(err.message || "Failed to delete partner", "error");
    }
  }

  async function togglePartnerActive(partner: SitePartner) {
    const updated = { ...partner, active: !partner.active };
    await saveSitePartner(updated);
  }

  // Interactive Configurable Event Gallery Helpers
  function addGalleryItem() {
    const current = (form.gallery as EventGalleryItem[]) || [];
    const newItem: EventGalleryItem = {
      url: "",
      caption: "",
      alt: "",
      category: "Summit",
      size: "standard",
    };
    update("gallery", [...current, newItem]);
    showToast("Added photo to gallery.");
  }

  function updateGalleryItem(index: number, partial: Partial<EventGalleryItem>) {
    const current = [...((form.gallery as EventGalleryItem[]) || [])];
    current[index] = { ...current[index], ...partial };
    update("gallery", current);
  }

  function removeGalleryItem(index: number) {
    const current = [...((form.gallery as EventGalleryItem[]) || [])];
    current.splice(index, 1);
    update("gallery", current);
    showToast("Gallery item removed.");
  }

  function moveGalleryItem(index: number, direction: "up" | "down") {
    const current = [...((form.gallery as EventGalleryItem[]) || [])];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= current.length) return;
    const temp = current[index];
    current[index] = current[target];
    current[target] = temp;
    update("gallery", current);
  }

  async function handleGalleryImageUpload(index: number, file?: File) {
    if (!file) return;
    try {
      showToast("Optimizing gallery photo...");
      const compressed = await compressImage(file);
      updateGalleryItem(index, { url: compressed });
      showToast("Photo attached to gallery card!");
    } catch (err: any) {
      showToast(err.message || "Failed to process photo", "error");
    }
  }

  function loadRecommendedGallery() {
    update("gallery", [
      { url: "/assets/abcn/events/alumni-welcome-stage.jpg", caption: "Alumni Welcome & Partner Stage", category: "Community", size: "wide" },
      { url: "/assets/abcn/events/founder-conversation-spotlight.jpg", caption: "Founder Conversation Spotlight", category: "Summit", size: "tall" },
      { url: "/assets/abcn/events/mentorship-conversation.jpg", caption: "Mentorship & Candid Dialogue", category: "Mentorship", size: "wide" },
      { url: "/assets/abcn/events/friends-welcome-moment.jpg", caption: "Founders Meeting Founders", category: "Networking", size: "tall" },
      { url: "/assets/abcn/events/cafe-networking-space.jpg", caption: "Informal Ecosystem Matchmaking", category: "Networking", size: "tall" },
      { url: "/assets/abcn/events/harmonie-programme-lead.jpg", caption: "Harmonie Essome · Programme Leadership", category: "Leadership", size: "tall" },
    ]);
    showToast("Loaded recommended summit atmosphere gallery!");
  }

  // Interactive array helpers
  function addListItem(key: "highlights" | "eligibility" | "highlights_de" | "eligibility_de") {
    const current = (form[key] as string[]) || [];
    update(key, [...current, ""]);
  }

  function updateListItem(
    key: "highlights" | "eligibility" | "highlights_de" | "eligibility_de",
    index: number,
    value: string
  ) {
    const current = [...((form[key] as string[]) || [])];
    current[index] = value;
    update(key, current);
  }

  function removeListItem(
    key: "highlights" | "eligibility" | "highlights_de" | "eligibility_de",
    index: number
  ) {
    const current = [...((form[key] as string[]) || [])];
    current.splice(index, 1);
    update(key, current);
  }

  // Visual Programme Stages Helpers (User-friendly, no JSON needed)
  function addStage() {
    const current = form.stages || [];
    const nextNum = current.length + 1;
    const newStage: EventStage = {
      stage: `Stage ${nextNum}`,
      title: "",
      description: "",
      items: [],
    };
    update("stages", [...current, newStage]);
    showToast(`Added Stage ${nextNum}.`);
  }

  function updateStage(index: number, updated: Partial<EventStage>) {
    const current = [...(form.stages || [])];
    current[index] = { ...current[index], ...updated };
    update("stages", current);
  }

  function removeStage(index: number) {
    const current = [...(form.stages || [])];
    current.splice(index, 1);
    update("stages", current);
    showToast("Stage removed.");
  }

  function moveStage(index: number, direction: "up" | "down") {
    const current = [...(form.stages || [])];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= current.length) return;
    const temp = current[index];
    current[index] = current[target];
    current[target] = temp;
    update("stages", current);
  }

  function addStageItem(stageIndex: number) {
    const current = [...(form.stages || [])];
    const stage = current[stageIndex];
    stage.items = [...(stage.items || []), ""];
    update("stages", current);
  }

  function updateStageItem(stageIndex: number, itemIndex: number, text: string) {
    const current = [...(form.stages || [])];
    const stage = current[stageIndex];
    stage.items[itemIndex] = text;
    update("stages", current);
  }

  function removeStageItem(stageIndex: number, itemIndex: number) {
    const current = [...(form.stages || [])];
    const stage = current[stageIndex];
    stage.items.splice(itemIndex, 1);
    update("stages", current);
  }

  // Partners & Logo Manager Helpers
  function addPartner() {
    const current = form.partners || [];
    const newPartner: EventPartner = {
      name: "",
      logo: "",
      website: "",
    };
    update("partners", [...current, newPartner]);
    showToast("Added new partner card.");
  }

  function updatePartner(index: number, updated: Partial<EventPartner>) {
    const current = [...(form.partners || [])];
    current[index] = { ...current[index], ...updated };
    update("partners", current);
  }

  async function removePartner(index: number) {
    const current = [...(form.partners || [])];
    const [removed] = current.splice(index, 1);
    // A brand-new, unsaved event has nothing in the database to delete from.
    if (!selectedId) {
      update("partners", current);
      showToast("Partner removed.");
      return;
    }
    if (removed?.name && !confirm(`Remove "${removed.name}" from this event? This is saved immediately.`)) return;
    try {
      const res = await fetch("/api/admin/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedId, partners: current }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.data) {
        throw new Error(json.error || `Could not remove partner (HTTP ${res.status}). Nothing was changed.`);
      }
      update("partners", current);
      setEvents((prev) => prev.map((ev) => (ev.id === selectedId ? { ...ev, partners: current } : ev)));
      showToast(`Removed ${removed?.name || "partner"} from the database.`);
    } catch (err: any) {
      showToast(err.message || "Could not remove partner", "error");
    }
  }

  function movePartner(index: number, direction: "up" | "down") {
    const current = [...(form.partners || [])];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= current.length) return;
    const temp = current[index];
    current[index] = current[target];
    current[target] = temp;
    update("partners", current);
  }

  async function handlePartnerLogoUpload(index: number, file?: File) {
    if (!file) return;
    try {
      showToast("Compressing partner logo...");
      const compressed = await compressImage(file);
      updatePartner(index, { logo: compressed });
      showToast("Partner logo uploaded & attached!");
    } catch (err: any) {
      showToast(err.message || "Failed to process logo", "error");
    }
  }

  function loadDefaultPartners() {
    const defaults: EventPartner[] = [
      { name: "SoftXcloud GmbH", logo: "/assets/partners/softxcloud.png", website: "https://softxcloud.net" },
      { name: "Mountain Hub", logo: "/assets/partners/mountain-hub.png", website: "https://mountainhub.org" },
      { name: "Kompass Frankfurt", logo: "/assets/fiali/logos/kompass-frankfurt.png", website: "https://kompassfrankfurt.de" },
      { name: "DIVOC Rising", logo: "/assets/fiali/logos/divoc-rising.png", website: "https://divocrising.com" },
      { name: "Black Women in Tech DACH", logo: "/assets/fiali/logos/black-women-in-tech-dach.png", website: "https://bwt-dach.org" },
      { name: "Flourish & Prosper", logo: "/assets/fiali/logos/flourish-prosper.png", website: "https://flourishprosper.com" },
    ];
    update("partners", defaults);
    showToast("Loaded 6 verified partner ecosystem logos.");
  }

  // Next / Previous Section Navigators
  const currentSectionIdx = useMemo(() => {
    return SECTIONS.findIndex((s) => s.id === editorTab);
  }, [editorTab]);

  function goToNextSection() {
    if (currentSectionIdx < SECTIONS.length - 1) {
      setEditorTab(SECTIONS[currentSectionIdx + 1].id);
      window.scrollTo({ top: 180, behavior: "smooth" });
    }
  }

  function goToPrevSection() {
    if (currentSectionIdx > 0) {
      setEditorTab(SECTIONS[currentSectionIdx - 1].id);
      window.scrollTo({ top: 180, behavior: "smooth" });
    }
  }

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchSearch =
        !eventsSearch ||
        ev.title.toLowerCase().includes(eventsSearch.toLowerCase()) ||
        (ev.city && ev.city.toLowerCase().includes(eventsSearch.toLowerCase()));
      const matchStatus = statusFilter === "all" || ev.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [events, eventsSearch, statusFilter]);

  // Filtered Pipeline Applications
  const filteredPipeline = useMemo(() => {
    return allApplications.filter((app) => {
      const matchEvent = pipelineEventFilter === "all" || app.event_id === pipelineEventFilter;
      const matchStatus = pipelineStatusFilter === "all" || app.status === pipelineStatusFilter;
      const matchSearch =
        !pipelineSearch ||
        `${app.first_name} ${app.last_name}`.toLowerCase().includes(pipelineSearch.toLowerCase()) ||
        app.email.toLowerCase().includes(pipelineSearch.toLowerCase()) ||
        (app.company_name && app.company_name.toLowerCase().includes(pipelineSearch.toLowerCase()));
      return matchEvent && matchStatus && matchSearch;
    });
  }, [allApplications, pipelineEventFilter, pipelineStatusFilter, pipelineSearch]);

  // Filtered Event Applications (for selected event)
  const filteredEventApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchStatus = pipelineStatusFilter === "all" || app.status === pipelineStatusFilter;
      const matchSearch =
        !pipelineSearch ||
        `${app.first_name} ${app.last_name}`.toLowerCase().includes(pipelineSearch.toLowerCase()) ||
        app.email.toLowerCase().includes(pipelineSearch.toLowerCase()) ||
        (app.company_name && app.company_name.toLowerCase().includes(pipelineSearch.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [applications, pipelineStatusFilter, pipelineSearch]);

  // Active applicants list for modal/fullscreen navigation
  const activeApplicantList = useMemo(() => {
    if (mainTab === "pipeline") return filteredPipeline;
    if (editorTab === "applicants" && applications.length > 0) return filteredEventApplications;
    return allApplications;
  }, [mainTab, filteredPipeline, editorTab, applications, filteredEventApplications, allApplications]);

  const currentApplicantIndex = useMemo(() => {
    if (!selectedApplicant) return -1;
    return activeApplicantList.findIndex((a) => a.id === selectedApplicant.id);
  }, [selectedApplicant, activeApplicantList]);

  // Keyboard shortcut listener for full-screen response dossier (Esc to close, Arrow keys to navigate)
  useEffect(() => {
    if (!selectedApplicant) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedApplicant(null);
        return;
      }
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "textarea" || tag === "input" || tag === "select") return;

      if (e.key === "ArrowLeft") {
        if (currentApplicantIndex > 0) {
          setSelectedApplicant(activeApplicantList[currentApplicantIndex - 1]);
        }
      } else if (e.key === "ArrowRight") {
        if (currentApplicantIndex >= 0 && currentApplicantIndex < activeApplicantList.length - 1) {
          setSelectedApplicant(activeApplicantList[currentApplicantIndex + 1]);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedApplicant, currentApplicantIndex, activeApplicantList]);

  function copyTextToClipboard(text: string, label: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`);
  }

  function appendAdminNote(noteTag: string) {
    if (!selectedApplicant) return;
    const currentNotes = selectedApplicant.admin_notes || "";
    const updatedNotes = currentNotes ? `${currentNotes}\n• ${noteTag}` : `• ${noteTag}`;
    updateApplicationStatus(selectedApplicant.id, selectedApplicant.status, updatedNotes);
  }

  // Metric KPIs
  const totalEventsCount = events.length;
  const publishedEventsCount = events.filter((e) => e.status === "published").length;
  const totalApplicantsCount = allApplications.length;
  const shortlistedApplicantsCount = allApplications.filter(
    (a) => a.status === "shortlisted" || a.status === "accepted" || a.status === "reviewing"
  ).length;

  if (mode === "checking") {
    return (
      <main className="cms" data-theme={adminTheme}>
        <header className="cms-top">
          <div className="cms-brand">
            <span className="cms-logo-badge">A</span>
            <div className="cms-brand-text">
              <h1>ABCN Executive Portal</h1>
              <span>Control Center</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Theme switcher */}
            <div className="cms-theme-switch-wrap" style={{ marginRight: "6px" }}>
              <button
                type="button"
                className={`cms-theme-btn ${adminTheme === "dark" ? "active" : ""}`}
                onClick={() => toggleAdminTheme("dark")}
                title="Switch to Dark Mode"
              >
                🌙
              </button>
              <button
                type="button"
                className={`cms-theme-btn ${adminTheme === "light" ? "active" : ""}`}
                onClick={() => toggleAdminTheme("light")}
                title="Switch to Light Mode"
              >
                ☀️
              </button>
            </div>

            <Link href="/events" className="cms-btn cms-btn-secondary" style={{ fontSize: "0.78rem" }}>
              View Public Events ↗
            </Link>
          </div>
        </header>

        <div className="cms-auth-container">
          <div className="cms-loader-card">
            {/* Rotating Orbital Rings and Core Emblem */}
            <div className="cms-loader-emblem-wrap">
              <div className="cms-loader-ring-outer" />
              <div className="cms-loader-ring-inner" />
              <div className="cms-loader-core-badge">A</div>
            </div>

            <span className="cms-loader-eyebrow">Executive Gateway</span>
            <h2 className="cms-loader-title">Connecting to Control Center</h2>
            <p className="cms-loader-subtitle">
              Verifying cryptographic credentials and establishing secure database pipeline…
            </p>

            {/* Indeterminate Animated Progress Bar */}
            <div className="cms-loader-bar-wrap">
              <div className="cms-loader-bar-fill" />
            </div>

            {/* Live Step Badge */}
            <div className="cms-loader-step-pill">
              <span className="cms-loader-dot-pulse" />
              <span>
                {loadingDuration === 0
                  ? "Establishing secure gateway handshake…"
                  : loadingDuration === 1
                  ? "Verifying executive credentials…"
                  : "Connecting to database pipeline…"}
              </span>
            </div>

            {/* Direct Instant Action Fallbacks */}
            <div className="cms-loader-fallback-actions">
              <button
                type="button"
                onClick={() => setMode("signed-out")}
                className="cms-btn cms-btn-primary"
                style={{ fontSize: "0.82rem", padding: "7px 16px" }}
              >
                Proceed to Sign In →
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoadingDuration(0);
                  refreshSession();
                }}
                className="cms-btn cms-btn-secondary"
                style={{ fontSize: "0.82rem", padding: "7px 14px" }}
              >
                Retry ↻
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (mode === "signed-out") {
    return (
      <main className="cms">
        <header className="cms-top">
          <div className="cms-brand">
            <span className="cms-logo-badge">A</span>
            <div className="cms-brand-text">
              <h1>ABCN Executive Portal</h1>
              <span>Control Center</span>
            </div>
          </div>
          <Link href="/events" className="cms-btn cms-btn-secondary" style={{ fontSize: "0.78rem" }}>
            View Public Events ↗
          </Link>
        </header>

        <div className="cms-auth-container">
          <div className="cms-auth-box">
            <div className="cms-auth-logo-center">
              <span className="cms-logo-badge" style={{ width: 48, height: 48, fontSize: "1.2rem" }}>
                A
              </span>
              <h2>Admin Authentication</h2>
              <p>Sign in with your administrator credentials to manage events & applications.</p>
            </div>

            <form onSubmit={signIn} className="cms-field" style={{ gap: "1rem" }}>
              <div className="cms-field">
                <label>Name (New accounts only)</label>
                <input
                  type="text"
                  placeholder="e.g. Harmonie Essome"
                  value={authForm.name}
                  onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                />
              </div>

              <div className="cms-field">
                <label>Administrator Email *</label>
                <input
                  type="email"
                  required
                  placeholder="afropeanbusiness@gmail.com"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                />
                <span className="cms-hint">
                  Registered Executive Account: <code>afropeanbusiness@gmail.com</code>
                </span>
              </div>

              <div className="cms-field">
                <label>Password *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••••••"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button type="submit" className="cms-btn cms-btn-primary" style={{ flex: 1 }}>
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={signUp}
                  className="cms-btn cms-btn-secondary"
                  style={{ flex: 1 }}
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
        {toast && <div className={`cms-toast ${toast.type}`}>{toast.text}</div>}
      </main>
    );
  }

  if (mode === "needs-admin") {
    return (
      <main className="cms">
        <header className="cms-top">
          <div className="cms-brand">
            <span className="cms-logo-badge">A</span>
            <div className="cms-brand-text">
              <h1>ABCN Executive Portal</h1>
              <span>One-Time Admin Claim</span>
            </div>
          </div>
          <button onClick={signOut} className="cms-btn cms-btn-secondary">
            Sign out
          </button>
        </header>

        <div className="cms-auth-container">
          <div className="cms-auth-box">
            <div className="cms-auth-logo-center">
              <span className="cms-logo-badge">A</span>
              <h2>Elevate to Administrator</h2>
              <p>Your account is authenticated. Enter the setup key to unlock the event control room.</p>
            </div>

            <div className="cms-field" style={{ gap: "1rem" }}>
              <div className="cms-field">
                <label>Setup Key / Token</label>
                <input
                  type="text"
                  placeholder="ABCN2026Admin!"
                  value={claimToken}
                  onChange={(e) => setClaimToken(e.target.value)}
                />
                <span className="cms-hint">Default setup key: ABCN2026Admin!</span>
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button onClick={claimAdmin} className="cms-btn cms-btn-primary" style={{ flex: 1 }}>
                  Claim Admin Access
                </button>
                <button onClick={signOut} className="cms-btn cms-btn-secondary">
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
        {toast && <div className={`cms-toast ${toast.type}`}>{toast.text}</div>}
      </main>
    );
  }

  return (
    <div className="cms-dashboard" data-theme={adminTheme}>
      {/* ---------------- Primary App Sidebar Menu ---------------- */}
      <aside className="cms-sidebar">
        <div className="cms-sidebar-header">
          <div className="cms-sidebar-brand">
            <span className="cms-logo-badge">A</span>
            <div>
              <h2>ABCN Portal</h2>
              <span className="cms-sidebar-sub">Executive Suite</span>
            </div>
          </div>
        </div>

        {/* Primary Navigation Menu */}
        <nav className="cms-sidebar-nav">
          <div className="cms-sidebar-group-label">WORKSPACE</div>
          <button
            type="button"
            className={`cms-sidebar-item ${mainTab === "events" ? "active" : ""}`}
            onClick={() => setMainTab("events")}
          >
            <span className="cms-nav-icon">📅</span>
            <span className="cms-nav-text">Events Manager</span>
            <span className="cms-nav-badge">{totalEventsCount}</span>
          </button>

          <button
            type="button"
            className={`cms-sidebar-item ${mainTab === "pipeline" ? "active" : ""}`}
            onClick={() => setMainTab("pipeline")}
          >
            <span className="cms-nav-icon">👥</span>
            <span className="cms-nav-text">Founder Pipeline</span>
            <span className="cms-nav-badge">{totalApplicantsCount}</span>
          </button>

          <button
            type="button"
            className={`cms-sidebar-item ${mainTab === "partners" ? "active" : ""}`}
            onClick={() => setMainTab("partners")}
          >
            <span className="cms-nav-icon">🤝</span>
            <span className="cms-nav-text">Website Partners</span>
            <span className="cms-nav-badge">{sitePartners.length}</span>
          </button>

          <button
            type="button"
            className={`cms-sidebar-item ${mainTab === "slideshow" ? "active" : ""}`}
            onClick={() => setMainTab("slideshow")}
          >
            <span className="cms-nav-icon">🎞️</span>
            <span className="cms-nav-text">Homepage Slideshow</span>
          </button>

          <button
            type="button"
            className={`cms-sidebar-item ${mainTab === "media" ? "active" : ""}`}
            onClick={() => setMainTab("media")}
          >
            <span className="cms-nav-icon">🖼️</span>
            <span className="cms-nav-text">Media & Assets</span>
          </button>

          {/* Contextual in-sidebar navigator when editing an event */}
          {mainTab === "events" && selectedId && (
            <div className="cms-sidebar-subnav">
              <div className="cms-sidebar-group-label">EVENT SECTIONS</div>
              {SECTIONS.map((sec, idx) => (
                <button
                  key={sec.id}
                  type="button"
                  className={`cms-sidebar-subitem ${editorTab === sec.id ? "active" : ""}`}
                  onClick={() => {
                    setEditorTab(sec.id);
                    window.scrollTo({ top: 180, behavior: "smooth" });
                  }}
                >
                  <span className="cms-subitem-num">0{idx + 1}</span>
                  <span className="cms-subitem-title">{sec.shortLabel}</span>
                </button>
              ))}
            </div>
          )}
        </nav>

        {/* Sidebar Footer with Theme Switcher and User Profile */}
        <div className="cms-sidebar-footer">
          <div className="cms-theme-toggle-box">
            <span className="cms-theme-label">Appearance</span>
            <div className="cms-theme-switcher">
              <button
                type="button"
                className={`cms-theme-btn ${adminTheme === "dark" ? "active" : ""}`}
                onClick={() => toggleAdminTheme("dark")}
                title="Obsidian Dark Mode"
              >
                🌙 Dark
              </button>
              <button
                type="button"
                className={`cms-theme-btn ${adminTheme === "light" ? "active" : ""}`}
                onClick={() => toggleAdminTheme("light")}
                title="Slate Light Mode"
              >
                ☀️ Light
              </button>
            </div>
          </div>

          <div className="cms-sidebar-user">
            <div className="cms-user-avatar">
              {(currentUser?.name || currentUser?.email || "A").charAt(0).toUpperCase()}
            </div>
            <div className="cms-sidebar-user-info">
              <strong>{currentUser?.name || currentUser?.email?.split('@')[0] || "Administrator"}</strong>
              <small>{currentUser?.email || "admin@abcn.network"}</small>
            </div>
            <button onClick={signOut} className="cms-sidebar-logout" title="Sign out">
              ⏻
            </button>
          </div>
        </div>
      </aside>

      <div className="cms-main-area">
        {/* ---------------- Top Sticky Header ---------------- */}
        <header className="cms-top">
          <div className="cms-brand">
            <div className="cms-brand-text">
              <h1 style={{ fontSize: "1.1rem" }}>
                {mainTab === "events" && "Events & Summit Management"}
                {mainTab === "pipeline" && "Founder Application CRM"}
                {mainTab === "partners" && "Website Partners & Collaborator Network"}
                {mainTab === "slideshow" && "Homepage Slideshow"}
                {mainTab === "media" && "Media & Global Asset Manager"}
              </h1>
              <span>Executive Control Room · ABCN</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="cms-top-actions">
            <Link href="/" target="_blank" className="cms-btn cms-btn-secondary" style={{ fontSize: "0.78rem" }}>
              Public Home ↗
            </Link>
            <Link href="/events" target="_blank" className="cms-btn cms-btn-secondary" style={{ fontSize: "0.78rem" }}>
              Public Events ↗
            </Link>
            {mainTab === "events" && (
              <button onClick={newEvent} className="cms-btn cms-btn-primary" style={{ fontSize: "0.82rem" }}>
                + New Event
              </button>
            )}
            {mainTab === "partners" && (
              <button
                onClick={() => {
                  setPartnerForm({
                    name: "",
                    logo_url: "",
                    website_url: "",
                    category: "Strategic Partner",
                    description: "",
                    priority: 10,
                    active: true,
                  });
                  setPartnerModalOpen(true);
                }}
                className="cms-btn cms-btn-primary"
                style={{ fontSize: "0.82rem" }}
              >
                + Add Website Partner
              </button>
            )}
          </div>
        </header>

        <div className="cms-wrap">
          {/* ---------------- KPI Stat Cards ---------------- */}
          <div className="cms-kpis">
            <div className="cms-kpi-card">
              <div className="cms-kpi-head">
                <span>Total Events</span>
                <span>All Statuses</span>
              </div>
              <div className="cms-kpi-value">{totalEventsCount}</div>
              <span className="cms-kpi-sub">{publishedEventsCount} currently published & visible</span>
            </div>

            <div className="cms-kpi-card">
              <div className="cms-kpi-head">
                <span>Published Live</span>
                <span className="cms-pill published">Live</span>
              </div>
              <div className="cms-kpi-value" style={{ color: "var(--cms-accent)" }}>
                {publishedEventsCount}
              </div>
              <span className="cms-kpi-sub">Serving public traffic across EN & DE routes</span>
            </div>

            <div className="cms-kpi-card">
              <div className="cms-kpi-head">
                <span>Total Applicants</span>
                <span>Founder Pipeline</span>
              </div>
              <div className="cms-kpi-value">{totalApplicantsCount}</div>
              <span className="cms-kpi-sub">Submissions received across all programmes</span>
            </div>

            <div className="cms-kpi-card">
              <div className="cms-kpi-head">
                <span>Active Candidates</span>
                <span className="cms-pill featured">Pipeline</span>
              </div>
              <div className="cms-kpi-value" style={{ color: "var(--cms-gold)" }}>
                {shortlistedApplicantsCount}
              </div>
              <span className="cms-kpi-sub">In Review, Shortlisted, or Accepted</span>
            </div>
          </div>

          {/* =========================================================================
              VIEW 1: EVENTS MANAGER (FULL CRUD)
              ========================================================================= */}
          {mainTab === "events" && (
            <div className="cms-main-grid">
              {/* Event List Panel */}
              <aside className="cms-events-list-panel">
                <div className="cms-events-list-header">
                  <h2>Events Index</h2>
                  <button onClick={newEvent} className="cms-btn cms-btn-primary" style={{ padding: "6px 12px" }}>
                    + New Event
                  </button>
                </div>

              <div className="cms-search-box">
                <input
                  type="text"
                  placeholder="Filter events by title or city…"
                  value={eventsSearch}
                  onChange={(e) => setEventsSearch(e.target.value)}
                />
              </div>

              <div className="cms-filter-pills">
                {["all", "published", "draft", "archived"].map((st) => (
                  <button
                    key={st}
                    className={`cms-filter-btn ${statusFilter === st ? "active" : ""}`}
                    onClick={() => setStatusFilter(st)}
                  >
                    {st.charAt(0).toUpperCase() + st.slice(1)}
                  </button>
                ))}
              </div>

              <div className="cms-event-cards">
                {filteredEvents.length === 0 ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--cms-text-muted)" }}>
                    No matching events found.
                  </div>
                ) : (
                  filteredEvents.map((event) => (
                    <article
                      key={event.id || event.slug}
                      onClick={() => selectEvent(event)}
                      className={`cms-event-item ${selectedId === event.id ? "active" : ""}`}
                    >
                      <div className="cms-event-item-head">
                        <h3 className="cms-event-item-title">{event.title}</h3>
                        <span className={`cms-pill ${event.status}`}>{event.status}</span>
                      </div>

                      <div className="cms-event-loc-date">
                        {event.date_label || "Date TBA"} · {event.city || "Venue TBA"}
                      </div>

                      <div className="cms-event-meta-tags">
                        {event.featured && <span className="cms-pill featured">★ Featured</span>}
                        {event.show_on_home && <span className="cms-pill home">Homepage</span>}
                        {event.application_open && (
                          <span className="cms-pill" style={{ background: "rgba(59,130,246,0.15)", color: "#60A5FA" }}>
                            Applications Open
                          </span>
                        )}
                        <span style={{ fontSize: "0.7rem", color: "var(--cms-text-muted)" }}>
                          Priority {event.priority}
                        </span>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </aside>

            {/* Right Pane: Tabbed Event Editor */}
            <section className="cms-editor-canvas">
              {/* Editor Top Bar */}
              <div className="cms-editor-top">
                <div className="cms-editor-title-wrap">
                  <h2>{selectedId ? form.title || "Untitled Event" : "Create New Event"}</h2>
                  <span>/{form.slug || "new-slug"}</span>
                </div>

                <div className="cms-editor-actions">
                  {selectedId && (
                    <a
                      href={`/events/${form.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cms-btn cms-btn-secondary"
                    >
                      View Live ↗
                    </a>
                  )}

                  {selectedId && (
                    <button
                      onClick={duplicateCurrentEvent}
                      className="cms-btn cms-btn-secondary"
                      title="Duplicate this event into a new draft"
                    >
                      Duplicate Event
                    </button>
                  )}

                  <button
                    onClick={() => setForm({ ...FIALI_FALLBACK })}
                    className="cms-btn cms-btn-secondary"
                    title="Load verified FIALI template"
                  >
                    Load FIALI Template
                  </button>

                  {selectedId && (
                    <button
                      onClick={() => setConfirmDeleteId(selectedId)}
                      className="cms-btn cms-btn-danger"
                    >
                      Delete Event
                    </button>
                  )}

                  <button
                    onClick={saveEvent}
                    disabled={saving}
                    className="cms-btn cms-btn-primary"
                  >
                    {saving ? "Saving…" : selectedId ? "Save Changes" : "Publish Event"}
                  </button>
                </div>
              </div>

              {/* Sub-Tabs Navigation (NO HORIZONTAL SCROLLER - RESPONSIVE PILLS) */}
              <div className="cms-sub-tabs">
                {SECTIONS.map((sec) => (
                  <button
                    key={sec.id}
                    className={`cms-sub-tab ${editorTab === sec.id ? "active" : ""}`}
                    onClick={() => setEditorTab(sec.id)}
                  >
                    <span className="cms-sub-tab-num">{sec.num}</span>
                    <span>{sec.label}</span>
                    {sec.id === "applicants" && applications.length > 0 && (
                      <span className="cms-sub-tab-badge">{applications.length}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Form Body */}
              <div className="cms-form-body">
                {/* TAB 1: CORE & STATUS */}
                {editorTab === "core" && (
                  <div className="cms-form-grid">
                    <div className="cms-field cms-col-full">
                      <label>Event Title *</label>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(e) => update("title", e.target.value)}
                        placeholder="e.g. Female Innovation Afropean Leadership Initiative"
                      />
                    </div>

                    <div className="cms-field">
                      <label>
                        <span>Slug (URL key) *</span>
                        <button
                          type="button"
                          onClick={generateSlug}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--cms-accent)",
                            cursor: "pointer",
                            fontSize: "0.7rem",
                          }}
                        >
                          Auto-generate from title
                        </button>
                      </label>
                      <input
                        type="text"
                        value={form.slug}
                        onChange={(e) =>
                          update(
                            "slug",
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, "-")
                              .replace(/(^-|-$)/g, "")
                          )
                        }
                        placeholder="fiali-frankfurt-2026"
                      />
                    </div>

                    <div className="cms-field">
                      <label>Eyebrow / Category Tag</label>
                      <input
                        type="text"
                        value={form.eyebrow || ""}
                        onChange={(e) => update("eyebrow", e.target.value)}
                        placeholder="FIALI · FRANKFURT 2026"
                      />
                    </div>

                    <div className="cms-field">
                      <label>Event Type</label>
                      <input
                        type="text"
                        value={form.event_type || ""}
                        onChange={(e) => update("event_type", e.target.value)}
                        placeholder="Flagship Programme / Summit"
                      />
                    </div>

                    <div className="cms-field">
                      <label>Organizer</label>
                      <input
                        type="text"
                        value={form.organizer || ""}
                        onChange={(e) => update("organizer", e.target.value)}
                        placeholder="ABCN · Afropean Business & Culture Network"
                      />
                    </div>

                    <div className="cms-field">
                      <label>Publishing Status</label>
                      <select
                        value={form.status}
                        onChange={(e) => update("status", e.target.value as Editable["status"])}
                      >
                        <option value="draft">Draft (Admin review only)</option>
                        <option value="published">Published (Live to public)</option>
                        <option value="archived">Archived (Hidden from index)</option>
                      </select>
                    </div>

                    <div className="cms-field">
                      <label>Priority Rank</label>
                      <input
                        type="number"
                        value={form.priority}
                        onChange={(e) => update("priority", Number(e.target.value))}
                      />
                      <span className="cms-hint">Higher values appear first on listing pages.</span>
                    </div>

                    <div className="cms-field cms-col-full">
                      <label>External Registration URL (Optional)</label>
                      <input
                        type="text"
                        value={form.registration_url || ""}
                        onChange={(e) => update("registration_url", e.target.value)}
                        placeholder="https://eventbrite.com/... (Leave blank if using internal applications)"
                      />
                    </div>

                    {/* Promotion & Application Toggles */}
                    <div
                      className="cms-col-full"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: "1rem",
                        marginTop: "1rem",
                      }}
                    >
                      <div className="cms-switch-row">
                        <div className="cms-switch-info">
                          <strong>Featured Event</strong>
                          <span>Prominent badge & highlights</span>
                        </div>
                        <label className="cms-switch-control">
                          <input
                            type="checkbox"
                            checked={form.featured}
                            onChange={(e) => update("featured", e.target.checked)}
                          />
                          <span className="cms-slider" />
                        </label>
                      </div>

                      <div className="cms-switch-row">
                        <div className="cms-switch-info">
                          <strong>Show on Homepage</strong>
                          <span>Highlight in main feed</span>
                        </div>
                        <label className="cms-switch-control">
                          <input
                            type="checkbox"
                            checked={form.show_on_home}
                            onChange={(e) => update("show_on_home", e.target.checked)}
                          />
                          <span className="cms-slider" />
                        </label>
                      </div>

                      <div className="cms-switch-row">
                        <div className="cms-switch-info">
                          <strong>Accept Applications</strong>
                          <span>Enable website wizard form</span>
                        </div>
                        <label className="cms-switch-control">
                          <input
                            type="checkbox"
                            checked={Boolean(form.application_open)}
                            onChange={(e) => update("application_open", e.target.checked)}
                          />
                          <span className="cms-slider" />
                        </label>
                      </div>
                    </div>

                    <div className="cms-field">
                      <label>Application CTA Button Text</label>
                      <input
                        type="text"
                        value={form.application_cta || ""}
                        onChange={(e) => update("application_cta", e.target.value)}
                        placeholder="Apply for FIALI 2026"
                      />
                    </div>

                    <div className="cms-field">
                      <label>Application Deadline / Scarcity Label</label>
                      <input
                        type="text"
                        value={form.application_deadline || ""}
                        onChange={(e) => update("application_deadline", e.target.value)}
                        placeholder="Applications reviewed on a rolling basis · limited places"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: LOCATION & DATES */}
                {editorTab === "location" && (
                  <div className="cms-form-grid">
                    <div className="cms-field cms-col-full">
                      <label>Human Date Display Label</label>
                      <input
                        type="text"
                        value={form.date_label || ""}
                        onChange={(e) => update("date_label", e.target.value)}
                        placeholder="e.g. 14 October 2026 · 18:00 CEST or April – May 2026"
                      />
                      <span className="cms-hint">Formatted text shown in event cards and hero banner.</span>
                    </div>

                    <div className="cms-field">
                      <label>Start Date & Time (ISO/Local)</label>
                      <input
                        type="datetime-local"
                        value={form.start_at ? form.start_at.slice(0, 16) : ""}
                        onChange={(e) =>
                          update(
                            "start_at",
                            e.target.value ? new Date(e.target.value).toISOString() : null
                          )
                        }
                      />
                    </div>

                    <div className="cms-field">
                      <label>End Date & Time (ISO/Local)</label>
                      <input
                        type="datetime-local"
                        value={form.end_at ? form.end_at.slice(0, 16) : ""}
                        onChange={(e) =>
                          update(
                            "end_at",
                            e.target.value ? new Date(e.target.value).toISOString() : null
                          )
                        }
                      />
                    </div>

                    <div className="cms-field">
                      <label>City</label>
                      <input
                        type="text"
                        value={form.city || ""}
                        onChange={(e) => update("city", e.target.value)}
                        placeholder="Frankfurt am Main"
                      />
                    </div>

                    <div className="cms-field">
                      <label>Country</label>
                      <input
                        type="text"
                        value={form.country || ""}
                        onChange={(e) => update("country", e.target.value)}
                        placeholder="Germany"
                      />
                    </div>

                    <div className="cms-field cms-col-full">
                      <label>Venue / Address Details</label>
                      <input
                        type="text"
                        value={form.venue || ""}
                        onChange={(e) => update("venue", e.target.value)}
                        placeholder="e.g. TechQuartier, Platz der Einheit 2, 60327 Frankfurt"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 3: CONTENT & EDITORIAL */}
                {editorTab === "content" && (
                  <div className="cms-form-grid">
                    <div className="cms-field cms-col-full">
                      <label>Short Description (Card Teaser)</label>
                      <textarea
                        rows={2}
                        value={form.short_description}
                        onChange={(e) => update("short_description", e.target.value)}
                        placeholder="One to two sentences summarizing the event for index cards and meta descriptions."
                      />
                    </div>

                    <div className="cms-field cms-col-full">
                      <label>Main Description</label>
                      <textarea
                        rows={4}
                        value={form.description}
                        onChange={(e) => update("description", e.target.value)}
                        placeholder="Overview of the programme, target audience, and goals."
                      />
                    </div>

                    <div className="cms-field cms-col-full">
                      <label>Long Description / Manifesto</label>
                      <textarea
                        rows={6}
                        value={form.long_description || ""}
                        onChange={(e) => update("long_description", e.target.value)}
                        placeholder="Comprehensive details, keynote topics, and founder vision."
                      />
                    </div>

                    {/* Interactive Highlights Builder */}
                    <div className="cms-field cms-col-full">
                      <label>Key Highlights</label>
                      <div className="cms-list-builder">
                        {(form.highlights || []).map((item, idx) => (
                          <div className="cms-list-row" key={idx}>
                            <input
                              type="text"
                              value={item}
                              placeholder="e.g. 10-15 international female founders selected for intensive cohort"
                              onChange={(e) => updateListItem("highlights", idx, e.target.value)}
                            />
                            <button
                              type="button"
                              className="cms-icon-btn"
                              onClick={() => removeListItem("highlights", idx)}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="cms-add-row-btn"
                          onClick={() => addListItem("highlights")}
                        >
                          + Add Highlight
                        </button>
                      </div>
                    </div>

                    {/* Interactive Eligibility Builder */}
                    <div className="cms-field cms-col-full">
                      <label>Eligibility & Who Should Apply</label>
                      <div className="cms-list-builder">
                        {(form.eligibility || []).map((item, idx) => (
                          <div className="cms-list-row" key={idx}>
                            <input
                              type="text"
                              value={item}
                              placeholder="e.g. Female founders based in Frankfurt am Main with early-stage venture"
                              onChange={(e) => updateListItem("eligibility", idx, e.target.value)}
                            />
                            <button
                              type="button"
                              className="cms-icon-btn"
                              onClick={() => removeListItem("eligibility", idx)}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="cms-add-row-btn"
                          onClick={() => addListItem("eligibility")}
                        >
                          + Add Eligibility Criterion
                        </button>
                      </div>
                    </div>

                    {/* Focus Areas & Benefits */}
                    <div className="cms-field">
                      <label>Focus Areas (Title | Description per line)</label>
                      <textarea
                        rows={4}
                        value={focusText}
                        onChange={(e) => update("focus_areas", cardsFromText(e.target.value))}
                        placeholder="AI & Digitalization | Hands-on workflow optimization&#10;Capital Access | Pitching to German business angels"
                      />
                    </div>

                    <div className="cms-field">
                      <label>Founder Benefits (Title | Description per line)</label>
                      <textarea
                        rows={4}
                        value={benefitsText}
                        onChange={(e) => update("benefits", cardsFromText(e.target.value))}
                        placeholder="€1,000 Micro-Grants | Financial support for cohort ventures&#10;Ecosystem Access | VIP introduction to Frankfurt innovation leaders"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 4: MEDIA & BRANDING */}
                {editorTab === "media" && (
                  <div className="cms-form-grid">
                    <div className="cms-field cms-col-full">
                      <div
                        style={{
                          padding: "10px 14px",
                          background: "rgba(59,130,246,0.08)",
                          border: "1px solid rgba(59,130,246,0.2)",
                          borderRadius: "var(--cms-radius-sm)",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <strong style={{ color: "#93C5FD", fontSize: "0.82rem" }}>
                          ℹ️ Where do uploaded images go?
                        </strong>
                        <p className="cms-hint" style={{ marginTop: "3px" }}>
                          Uploaded image files are compressed automatically in your browser and stored securely directly inside your <strong>Neon PostgreSQL database</strong> as high-efficiency optimized image data. You can also specify any existing local asset (e.g. <code>/assets/fiali/...</code>) or external CDN link below.
                        </p>
                      </div>

                      <label>Hero Image (Upload or specify URL)</label>
                      <div
                        className="cms-image-upload-zone"
                        onClick={() => document.getElementById("hero-file")?.click()}
                      >
                        <input
                          id="hero-file"
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => handleImage(e.target.files?.[0])}
                        />
                        <div style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>🖼️</div>
                        <strong>Click or drag to upload an image from your device</strong>
                        <p className="cms-hint" style={{ marginTop: "4px" }}>
                          High-resolution JPEG/PNG files are automatically scaled and compressed for instant loading.
                        </p>
                      </div>

                      {form.hero_image_url && (
                        <div className="cms-image-preview-box">
                          <img src={form.hero_image_url} alt="Hero banner preview" />
                        </div>
                      )}

                      <div style={{ marginTop: "0.75rem" }}>
                        <label>Or Direct Hero Image URL</label>
                        <input
                          type="text"
                          value={form.hero_image_url || ""}
                          onChange={(e) => update("hero_image_url", e.target.value)}
                          placeholder="/assets/abcn/events/female-founders-lineup.jpg"
                        />
                      </div>
                    </div>

                    {/* Card Thumbnail Image Uploader (Displayed on /events page) */}
                    <div className="cms-field cms-col-full">
                      <label>Event Card Thumbnail Image (Displayed on /events directory & cards)</label>
                      <div
                        className="cms-image-upload-zone"
                        onClick={() => document.getElementById("card-file")?.click()}
                      >
                        <input
                          id="card-file"
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => handleCardImage(e.target.files?.[0])}
                        />
                        <div style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>📇</div>
                        <strong>Click or drag to upload Card Thumbnail from your device</strong>
                        <p className="cms-hint" style={{ marginTop: "4px" }}>
                          Used in the /events grid card, search results, and event teasers.
                        </p>
                      </div>

                      {form.card_image_url && (
                        <div className="cms-image-preview-box" style={{ maxHeight: "200px" }}>
                          <img src={form.card_image_url} alt="Card thumbnail preview" />
                        </div>
                      )}

                      <div style={{ marginTop: "0.75rem" }}>
                        <label>Or Direct Card Thumbnail Image URL / Asset Path</label>
                        <input
                          type="text"
                          value={form.card_image_url || ""}
                          onChange={(e) => update("card_image_url", e.target.value)}
                          placeholder="/assets/abcn/events/workshop-listening-session.jpg"
                        />
                      </div>
                    </div>

                    {/* Brand Palette Customizer */}
                    <div className="cms-field">
                      <label>Brand Accent Color</label>
                      <div className="cms-color-row">
                        <input
                          type="color"
                          className="cms-color-picker-input"
                          value={form.accent_color || "#58AC8C"}
                          onChange={(e) => update("accent_color", e.target.value)}
                        />
                        <input
                          type="text"
                          value={form.accent_color || "#58AC8C"}
                          onChange={(e) => update("accent_color", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="cms-field">
                      <label>Deep Theme Color</label>
                      <div className="cms-color-row">
                        <input
                          type="color"
                          className="cms-color-picker-input"
                          value={form.deep_color || "#0F4C38"}
                          onChange={(e) => update("deep_color", e.target.value)}
                        />
                        <input
                          type="text"
                          value={form.deep_color || "#0F4C38"}
                          onChange={(e) => update("deep_color", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="cms-field cms-col-full">
                      <label>Live Event Card Swatch Preview</label>
                      <div
                        className="cms-brand-swatch-preview"
                        style={{
                          background: `linear-gradient(135deg, ${form.deep_color || "#0F4C38"}, ${
                            form.accent_color || "#58AC8C"
                          })`,
                          color: "#fff",
                        }}
                      >
                        <span>{form.title || "Event Palette Preview"}</span>
                        <span style={{ fontSize: "0.75rem", opacity: 0.9 }}>
                          {form.accent_color} / {form.deep_color}
                        </span>
                      </div>
                    </div>

                    {/* ---------------- Configurable Event Atmosphere & Media Gallery ---------------- */}
                    <div className="cms-col-full" style={{ marginTop: "1.5rem" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: "1rem",
                          paddingBottom: "0.75rem",
                          borderBottom: "1px solid var(--cms-border)",
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: "1.05rem", color: "var(--cms-text-primary)" }}>
                            📸 Event Atmosphere & Recap Gallery
                          </strong>
                          <p className="cms-hint" style={{ margin: "2px 0 0" }}>
                            Curate moments, workshops, and speaker photos shown on the public event page.
                          </p>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            type="button"
                            className="cms-btn cms-btn-secondary"
                            onClick={loadRecommendedGallery}
                            style={{ fontSize: "0.78rem" }}
                          >
                            ⚡ Load Recommended Gallery
                          </button>
                          <button
                            type="button"
                            className="cms-btn cms-btn-primary"
                            onClick={addGalleryItem}
                            style={{ fontSize: "0.78rem" }}
                          >
                            + Add Gallery Photo
                          </button>
                        </div>
                      </div>

                      {(!form.gallery || form.gallery.length === 0) ? (
                        <div
                          style={{
                            padding: "2.5rem 1rem",
                            textAlign: "center",
                            background: "var(--cms-surface)",
                            border: "1px dashed var(--cms-border)",
                            borderRadius: "var(--cms-radius-md)",
                            marginTop: "1rem",
                          }}
                        >
                          <span style={{ fontSize: "2rem", display: "block", marginBottom: "0.5rem" }}>
                            🖼️
                          </span>
                          <strong style={{ color: "var(--cms-text-primary)" }}>No gallery photos added yet</strong>
                          <p className="cms-hint" style={{ marginTop: "4px" }}>
                            Add photos to showcase the summit atmosphere, networking, workshops, or pitch stages.
                          </p>
                          <button
                            type="button"
                            className="cms-btn cms-btn-secondary"
                            onClick={loadRecommendedGallery}
                            style={{ marginTop: "0.85rem", fontSize: "0.82rem" }}
                          >
                            Load 6 Curated Summit Photos
                          </button>
                        </div>
                      ) : (
                        <div className="cms-gallery-grid" style={{ marginTop: "1rem" }}>
                          {form.gallery.map((item, idx) => (
                            <div className="cms-gallery-card" key={idx}>
                              <div className="cms-gallery-card-head">
                                <span className="cms-pill featured" style={{ fontSize: "0.68rem" }}>
                                  Photo 0{idx + 1} · {item.category || "Atmosphere"}
                                </span>
                                <div style={{ display: "flex", gap: "3px" }}>
                                  <button
                                    type="button"
                                    className="cms-icon-btn"
                                    title="Move earlier"
                                    disabled={idx === 0}
                                    onClick={() => moveGalleryItem(idx, "up")}
                                  >
                                    ▲
                                  </button>
                                  <button
                                    type="button"
                                    className="cms-icon-btn"
                                    title="Move later"
                                    disabled={idx === (form.gallery?.length || 0) - 1}
                                    onClick={() => moveGalleryItem(idx, "down")}
                                  >
                                    ▼
                                  </button>
                                  <button
                                    type="button"
                                    className="cms-icon-btn danger"
                                    title="Remove photo"
                                    onClick={() => removeGalleryItem(idx)}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>

                              {/* Photo Preview / Upload Dropzone */}
                              <div
                                className="cms-gallery-preview-box"
                                onClick={() => document.getElementById(`gallery-file-${idx}`)?.click()}
                                title="Click to upload a replacement photo"
                              >
                                <input
                                  id={`gallery-file-${idx}`}
                                  type="file"
                                  accept="image/*"
                                  style={{ display: "none" }}
                                  onChange={(e) => handleGalleryImageUpload(idx, e.target.files?.[0])}
                                />
                                {item.url ? (
                                  <img src={item.url} alt={item.caption || `Gallery photo ${idx + 1}`} />
                                ) : (
                                  <div style={{ textAlign: "center", padding: "1rem" }}>
                                    <div style={{ fontSize: "1.5rem" }}>📤</div>
                                    <span style={{ fontSize: "0.76rem", color: "var(--cms-accent)" }}>
                                      Click to upload image
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Fields */}
                              <div className="cms-field">
                                <label style={{ fontSize: "0.72rem" }}>Image URL / Local Asset Path</label>
                                <input
                                  type="text"
                                  value={item.url || ""}
                                  placeholder="/assets/fiali/... or https://..."
                                  onChange={(e) => updateGalleryItem(idx, { url: e.target.value })}
                                  style={{ fontSize: "0.78rem", padding: "6px 8px" }}
                                />
                              </div>

                              <div className="cms-field">
                                <label style={{ fontSize: "0.72rem" }}>Caption / Title</label>
                                <input
                                  type="text"
                                  value={item.caption || ""}
                                  placeholder="e.g. Intensive Growth Lab Workshop"
                                  onChange={(e) => updateGalleryItem(idx, { caption: e.target.value })}
                                  style={{ fontSize: "0.78rem", padding: "6px 8px" }}
                                />
                              </div>

                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                                <div className="cms-field">
                                  <label style={{ fontSize: "0.72rem" }}>Category Tag</label>
                                  <select
                                    value={item.category || "Summit"}
                                    onChange={(e) => updateGalleryItem(idx, { category: e.target.value })}
                                    style={{ fontSize: "0.78rem", padding: "6px 8px" }}
                                  >
                                    <option value="Summit">Summit</option>
                                    <option value="Workshops">Workshops</option>
                                    <option value="Networking">Networking</option>
                                    <option value="Pitch">Pitch Stage</option>
                                    <option value="Keynote">Keynote</option>
                                    <option value="Atmosphere">Atmosphere</option>
                                  </select>
                                </div>

                                <div className="cms-field">
                                  <label style={{ fontSize: "0.72rem" }}>Layout Span</label>
                                  <select
                                    value={item.size || "standard"}
                                    onChange={(e) => updateGalleryItem(idx, { size: e.target.value as any })}
                                    style={{ fontSize: "0.78rem", padding: "6px 8px" }}
                                  >
                                    <option value="standard">Standard (1 col)</option>
                                    <option value="wide">Wide (Spans 2 cols)</option>
                                    <option value="tall">Tall Portrait</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 5: PROGRAMME STAGES & GRANTS (USER-FRIENDLY VISUAL BUILDER) */}
                {editorTab === "stages" && (
                  <div className="cms-form-grid">
                    <div className="cms-col-full" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                      <div>
                        <strong style={{ fontSize: "1.1rem" }}>Programme Stages & Curriculum</strong>
                        <span className="cms-hint" style={{ display: "block" }}>
                          Build structured multi-part phases, workshops, and milestones visually without writing raw JSON.
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          className="cms-btn cms-btn-secondary"
                          onClick={() => setRawJsonMode(!rawJsonMode)}
                        >
                          {rawJsonMode ? "Switch to Visual Cards" : "Advanced JSON Editor"}
                        </button>
                        <button
                          type="button"
                          className="cms-btn cms-btn-primary"
                          onClick={addStage}
                        >
                          + Add New Stage
                        </button>
                      </div>
                    </div>

                    {rawJsonMode ? (
                      <>
                        <div className="cms-field cms-col-full">
                          <label>Programme Stages ({form.stages?.length || 0} Stages) — Raw JSON</label>
                          <textarea
                            rows={8}
                            style={{ fontFamily: "monospace", fontSize: "0.82rem" }}
                            value={stagesText}
                            onChange={(e) => {
                              try {
                                update("stages", JSON.parse(e.target.value) as EventStage[]);
                              } catch {
                                // Syntax error will resolve as user types
                              }
                            }}
                          />
                        </div>

                        <div className="cms-field cms-col-full">
                          <label>Grants & Support Package — Raw JSON</label>
                          <textarea
                            rows={5}
                            style={{ fontFamily: "monospace", fontSize: "0.82rem" }}
                            value={grantsText}
                            onChange={(e) => {
                              try {
                                update("grants", JSON.parse(e.target.value));
                              } catch {
                                // Syntax error will resolve as user types
                              }
                            }}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Visual Stage Cards List */}
                        <div className="cms-col-full">
                          {(!form.stages || form.stages.length === 0) ? (
                            <div style={{ padding: "2.5rem", textAlign: "center", background: "rgba(0,0,0,0.15)", border: "1px dashed var(--cms-border)", borderRadius: "var(--cms-radius-md)" }}>
                              <p style={{ color: "var(--cms-text-secondary)", margin: "0 0 1rem" }}>
                                No programme stages defined for this event yet.
                              </p>
                              <button type="button" onClick={addStage} className="cms-btn cms-btn-primary">
                                + Create First Programme Stage
                              </button>
                            </div>
                          ) : (
                            form.stages.map((stg, sIdx) => (
                              <div className="cms-stage-card" key={sIdx}>
                                <div className="cms-stage-card-head">
                                  <div className="cms-stage-card-title">
                                    <span className="cms-stage-badge">{stg.stage || `Stage ${sIdx + 1}`}</span>
                                    <strong style={{ fontSize: "1rem" }}>{stg.title || "Untitled Stage"}</strong>
                                  </div>
                                  <div className="cms-stage-card-actions">
                                    <button
                                      type="button"
                                      onClick={() => moveStage(sIdx, "up")}
                                      disabled={sIdx === 0}
                                      className="cms-icon-btn"
                                      title="Move Stage Up"
                                    >
                                      ▲
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveStage(sIdx, "down")}
                                      disabled={sIdx === form.stages.length - 1}
                                      className="cms-icon-btn"
                                      title="Move Stage Down"
                                    >
                                      ▼
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeStage(sIdx)}
                                      className="cms-icon-btn"
                                      title="Delete Stage"
                                      style={{ color: "var(--cms-danger)" }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>

                                <div className="cms-form-grid">
                                  <div className="cms-field">
                                    <label>Stage Phase / Number</label>
                                    <input
                                      type="text"
                                      value={stg.stage || ""}
                                      onChange={(e) => updateStage(sIdx, { stage: e.target.value })}
                                      placeholder="e.g. Stage 1 or Phase 01"
                                    />
                                  </div>

                                  <div className="cms-field">
                                    <label>Stage Title</label>
                                    <input
                                      type="text"
                                      value={stg.title || ""}
                                      onChange={(e) => updateStage(sIdx, { title: e.target.value })}
                                      placeholder="e.g. Female Innovation Growth Lab"
                                    />
                                  </div>

                                  <div className="cms-field cms-col-full">
                                    <label>Stage Overview & Deliverables</label>
                                    <textarea
                                      rows={3}
                                      value={stg.description || ""}
                                      onChange={(e) => updateStage(sIdx, { description: e.target.value })}
                                      placeholder="A full-day intensive workshop supported by an external AI expert..."
                                    />
                                  </div>

                                  {/* Stage Key Curriculum Items */}
                                  <div className="cms-field cms-col-full">
                                    <label>Curriculum Topics & Key Modules</label>
                                    <div className="cms-list-builder">
                                      {(stg.items || []).map((itm, iIdx) => (
                                        <div className="cms-list-row" key={iIdx}>
                                          <input
                                            type="text"
                                            value={itm}
                                            placeholder="e.g. Business Model Development or AI Automation"
                                            onChange={(e) => updateStageItem(sIdx, iIdx, e.target.value)}
                                          />
                                          <button
                                            type="button"
                                            className="cms-icon-btn"
                                            onClick={() => removeStageItem(sIdx, iIdx)}
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ))}
                                      <button
                                        type="button"
                                        className="cms-add-row-btn"
                                        onClick={() => addStageItem(sIdx)}
                                      >
                                        + Add Topic / Module
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* User-Friendly Grants Builder */}
                        <div className="cms-col-full" style={{ marginTop: "1.5rem", borderTop: "1px solid var(--cms-border)", paddingTop: "1.5rem" }}>
                          <strong style={{ fontSize: "1.1rem", display: "block", marginBottom: "4px" }}>
                            Financial Grants & Stipend Package
                          </strong>
                          <span className="cms-hint">Configure micro-grants and support provided to founders.</span>
                        </div>

                        <div className="cms-field">
                          <label>Grant Title</label>
                          <input
                            type="text"
                            value={form.grants?.title || ""}
                            onChange={(e) => update("grants", { ...form.grants, title: e.target.value })}
                            placeholder="e.g. Micro-Grant & Growth Support"
                          />
                        </div>

                        <div className="cms-field">
                          <label>Grant Amount Each</label>
                          <input
                            type="text"
                            value={form.grants?.amount_each || ""}
                            onChange={(e) => update("grants", { ...form.grants, amount_each: e.target.value })}
                            placeholder="e.g. €1,000"
                          />
                        </div>

                        <div className="cms-field">
                          <label>Number of Grants Available</label>
                          <input
                            type="number"
                            value={form.grants?.count || 0}
                            onChange={(e) => update("grants", { ...form.grants, count: Number(e.target.value) })}
                            placeholder="5"
                          />
                        </div>

                        <div className="cms-field cms-col-full">
                          <label>Grant Conditions & Details</label>
                          <textarea
                            rows={3}
                            value={form.grants?.description || ""}
                            onChange={(e) => update("grants", { ...form.grants, description: e.target.value })}
                            placeholder="Details of financial support, disbursement schedule, or eligibility conditions..."
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* TAB 6: PARTNERS & LOGO MANAGER MODULE */}
                {editorTab === "partners" && (
                  <div className="cms-form-grid">
                    <div className="cms-col-full" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                      <div>
                        <strong style={{ fontSize: "1.1rem" }}>Partners & Logo Manager</strong>
                        <span className="cms-hint" style={{ display: "block" }}>
                          Manage ecosystem collaborators, sponsors, and corporate logos displayed on event banners and tickers.
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          onClick={loadDefaultPartners}
                          className="cms-btn cms-btn-secondary"
                        >
                          Load Verified ABCN Partners
                        </button>
                        <button
                          type="button"
                          onClick={addPartner}
                          className="cms-btn cms-btn-primary"
                        >
                          + Add Partner
                        </button>
                      </div>
                    </div>

                    {(!form.partners || form.partners.length === 0) ? (
                      <div className="cms-col-full" style={{ padding: "3rem", textAlign: "center", background: "rgba(0,0,0,0.15)", border: "1px dashed var(--cms-border)", borderRadius: "var(--cms-radius-md)" }}>
                        <p style={{ color: "var(--cms-text-secondary)", margin: "0 0 1rem" }}>
                          No partner logos attached to this event yet.
                        </p>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                          <button type="button" onClick={addPartner} className="cms-btn cms-btn-primary">
                            + Add Custom Partner
                          </button>
                          <button type="button" onClick={loadDefaultPartners} className="cms-btn cms-btn-secondary">
                            Load Verified ABCN Ecosystem
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="cms-col-full cms-partner-grid">
                        {form.partners.map((partner, pIdx) => (
                          <div className="cms-partner-card" key={pIdx}>
                            <div className="cms-partner-card-head">
                              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--cms-text-secondary)" }}>
                                Partner #{pIdx + 1}
                              </span>
                              <div style={{ display: "flex", gap: "4px" }}>
                                <button
                                  type="button"
                                  onClick={() => movePartner(pIdx, "up")}
                                  disabled={pIdx === 0}
                                  className="cms-icon-btn"
                                  style={{ width: "26px", height: "26px" }}
                                  title="Move Left/Up"
                                >
                                  ◀
                                </button>
                                <button
                                  type="button"
                                  onClick={() => movePartner(pIdx, "down")}
                                  disabled={pIdx === form.partners.length - 1}
                                  className="cms-icon-btn"
                                  style={{ width: "26px", height: "26px" }}
                                  title="Move Right/Down"
                                >
                                  ▶
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removePartner(pIdx)}
                                  className="cms-icon-btn"
                                  style={{ width: "26px", height: "26px", color: "var(--cms-danger)" }}
                                  title="Remove Partner"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>

                            {/* Logo Box with Live Preview and Click-to-Upload */}
                            <div
                              className="cms-partner-logo-box"
                              onClick={() => document.getElementById(`partner-logo-${pIdx}`)?.click()}
                              title="Click to upload logo image"
                            >
                              <input
                                id={`partner-logo-${pIdx}`}
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={(e) => handlePartnerLogoUpload(pIdx, e.target.files?.[0])}
                              />
                              {partner.logo ? (
                                <img src={partner.logo} alt={partner.name || "Partner Logo"} />
                              ) : (
                                <div style={{ textAlign: "center", color: "var(--cms-text-muted)", fontSize: "0.78rem" }}>
                                  <span style={{ fontSize: "1.2rem", display: "block" }}>🏢</span>
                                  Click to upload logo
                                </div>
                              )}
                            </div>

                            <div className="cms-field">
                              <label>Partner / Sponsor Name *</label>
                              <input
                                type="text"
                                value={partner.name}
                                onChange={(e) => updatePartner(pIdx, { name: e.target.value })}
                                placeholder="e.g. SoftXcloud GmbH"
                              />
                            </div>

                            <div className="cms-field">
                              <label>Logo URL or Asset Path</label>
                              <input
                                type="text"
                                value={partner.logo || ""}
                                onChange={(e) => updatePartner(pIdx, { logo: e.target.value })}
                                placeholder="/assets/partners/softxcloud.png"
                              />
                            </div>

                            <div className="cms-field">
                              <label>
                                <span>Website URL</span>
                                {partner.website && (
                                  <a
                                    href={partner.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: "var(--cms-accent)", textDecoration: "none", fontSize: "0.7rem" }}
                                  >
                                    Test Link ↗
                                  </a>
                                )}
                              </label>
                              <input
                                type="text"
                                value={partner.website || ""}
                                onChange={(e) => updatePartner(pIdx, { website: e.target.value })}
                                placeholder="https://..."
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 6: GERMAN LOCALIZATION */}
                {editorTab === "german" && (
                  <div className="cms-form-grid">
                    <div
                      className="cms-col-full"
                      style={{
                        padding: "12px",
                        background: "rgba(229,184,105,0.08)",
                        border: "1px solid rgba(229,184,105,0.2)",
                        borderRadius: "var(--cms-radius-sm)",
                      }}
                    >
                      <strong style={{ color: "var(--cms-gold)", fontSize: "0.85rem", display: "block" }}>
                        Deutsche Übersetzung / German Localization
                      </strong>
                      <span className="cms-hint">
                        Fields left blank automatically fall back to the primary English values, ensuring robust rendering on /de.
                      </span>
                    </div>

                    <div className="cms-field cms-col-full">
                      <label>Titel (DE)</label>
                      <input
                        type="text"
                        value={form.title_de || ""}
                        onChange={(e) => update("title_de", e.target.value)}
                        placeholder="Female Innovation Afropean Leadership Initiative (FIALI)"
                      />
                    </div>

                    <div className="cms-field">
                      <label>Eyebrow / Rubrik (DE)</label>
                      <input
                        type="text"
                        value={form.eyebrow_de || ""}
                        onChange={(e) => update("eyebrow_de", e.target.value)}
                        placeholder="FIALI · FRANKFURT 2026"
                      />
                    </div>

                    <div className="cms-field">
                      <label>Bewerbungs-Button CTA (DE)</label>
                      <input
                        type="text"
                        value={form.application_cta_de || ""}
                        onChange={(e) => update("application_cta_de", e.target.value)}
                        placeholder="Jetzt für FIALI 2026 bewerben"
                      />
                    </div>

                    <div className="cms-field cms-col-full">
                      <label>Kurzbeschreibung (DE)</label>
                      <textarea
                        rows={2}
                        value={form.short_description_de || ""}
                        onChange={(e) => update("short_description_de", e.target.value)}
                        placeholder="Förderung internationaler Gründerinnen in Frankfurt durch intensive Geschäftsentwicklung..."
                      />
                    </div>

                    <div className="cms-field cms-col-full">
                      <label>Hauptbeschreibung (DE)</label>
                      <textarea
                        rows={4}
                        value={form.description_de || ""}
                        onChange={(e) => update("description_de", e.target.value)}
                        placeholder="Ein zweiteiliges Pilotprogramm, das 10–15 internationale Gründerinnen..."
                      />
                    </div>

                    <div className="cms-field cms-col-full">
                      <label>Ausführliche Beschreibung (DE)</label>
                      <textarea
                        rows={5}
                        value={form.long_description_de || ""}
                        onChange={(e) => update("long_description_de", e.target.value)}
                      />
                    </div>

                    <div className="cms-field">
                      <label>Datumsanzeige (DE)</label>
                      <input
                        type="text"
                        value={form.date_label_de || ""}
                        onChange={(e) => update("date_label_de", e.target.value)}
                        placeholder="April – Mai 2026"
                      />
                    </div>

                    <div className="cms-field">
                      <label>Veranstaltungsort (DE)</label>
                      <input
                        type="text"
                        value={form.venue_de || ""}
                        onChange={(e) => update("venue_de", e.target.value)}
                        placeholder="Frankfurt am Main, Deutschland"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 7: APPLICANTS FOR THIS EVENT */}
                {editorTab === "applicants" && selectedId && (
                  <div className="cms-pipeline-wrap">
                    <div className="cms-pipeline-head">
                      <div>
                        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                          Founder Submissions ({applications.length})
                        </h3>
                        <span className="cms-hint">Candidates registered specifically for this event.</span>
                      </div>

                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button
                          onClick={() => copyEmailList(applications, "comma")}
                          className="cms-btn cms-btn-secondary"
                        >
                          📋 Copy Email List
                        </button>
                        <button
                          onClick={() => exportApplicantsCSV(applications, `abcn-${form.slug}-applicants`)}
                          className="cms-btn cms-btn-secondary"
                        >
                          📥 Export CSV
                        </button>
                        <button
                          onClick={() => openGroupEmail(applications)}
                          className="cms-btn cms-btn-gold"
                        >
                          ✉️ Email All
                        </button>
                      </div>
                    </div>

                    {applicationsLoading ? (
                      <div style={{ padding: "3rem", textAlign: "center", color: "var(--cms-text-secondary)" }}>
                        Loading applications…
                      </div>
                    ) : applications.length === 0 ? (
                      <div style={{ padding: "3rem", textAlign: "center", color: "var(--cms-text-muted)" }}>
                        No applications received for this event yet.
                      </div>
                    ) : (
                      <table className="cms-table">
                        <thead>
                          <tr>
                            <th>Founder</th>
                            <th>Venture</th>
                            <th>Email</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {applications.map((app) => (
                            <tr key={app.id}>
                              <td>
                                <span className="cms-applicant-name">
                                  {app.first_name} {app.last_name}
                                </span>
                                <span className="cms-applicant-sub">{app.role_title || "Founder"}</span>
                              </td>
                              <td>{app.company_name || "Venture TBA"}</td>
                              <td>{app.email}</td>
                              <td>{new Date(app.submitted_at).toLocaleDateString()}</td>
                              <td>
                                <select
                                  className="cms-status-select"
                                  value={app.status}
                                  onChange={(e) => updateApplicationStatus(app.id, e.target.value)}
                                >
                                  <option value="submitted">Submitted</option>
                                  <option value="reviewing">In Review</option>
                                  <option value="shortlisted">Shortlisted</option>
                                  <option value="accepted">Accepted</option>
                                  <option value="declined">Declined</option>
                                </select>
                              </td>
                              <td>
                                <div style={{ display: "flex", gap: "6px" }}>
                                  <button
                                    onClick={() => setSelectedApplicant(app)}
                                    className="cms-btn cms-btn-secondary"
                                    style={{ padding: "4px 8px", fontSize: "0.72rem" }}
                                  >
                                    Review
                                  </button>
                                  <button
                                    onClick={() => deleteApplication(app.id)}
                                    className="cms-btn cms-btn-danger"
                                    style={{ padding: "4px 8px", fontSize: "0.72rem" }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>

              {/* ---------------- WIZARD PREVIOUS / NEXT FOOTER ---------------- */}
              <div className="cms-editor-footer-nav">
                <button
                  type="button"
                  onClick={goToPrevSection}
                  disabled={currentSectionIdx === 0}
                  className="cms-btn cms-btn-secondary"
                >
                  ← Previous: {currentSectionIdx > 0 ? SECTIONS[currentSectionIdx - 1].shortLabel : "Start"}
                </button>

                <div className="cms-footer-step-indicator">
                  <div className="cms-step-dots">
                    {SECTIONS.map((sec, idx) => (
                      <span
                        key={sec.id}
                        className={`cms-step-dot ${
                          idx === currentSectionIdx ? "active" : idx < currentSectionIdx ? "completed" : ""
                        }`}
                        title={sec.label}
                        onClick={() => setEditorTab(sec.id)}
                        style={{ cursor: "pointer" }}
                      />
                    ))}
                  </div>
                  <span>
                    Section {currentSectionIdx + 1} of {SECTIONS.length} · {SECTIONS[currentSectionIdx].label}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  {currentSectionIdx < SECTIONS.length - 1 ? (
                    <button
                      type="button"
                      onClick={goToNextSection}
                      className="cms-btn cms-btn-primary"
                    >
                      Next: {SECTIONS[currentSectionIdx + 1].shortLabel} →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={saveEvent}
                      disabled={saving}
                      className="cms-btn cms-btn-primary"
                    >
                      {saving ? "Saving…" : "Save All Changes ✓"}
                    </button>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* =========================================================================
            VIEW 2: DEDICATED FOUNDER PIPELINE REVIEW & EMAIL LIST BUILDER
            ========================================================================= */}
        {mainTab === "pipeline" && (
          <div className="cms-pipeline-wrap">
            <div className="cms-pipeline-head">
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: "1.4rem", fontWeight: 800 }}>
                  Founder Pipeline & Candidate Review
                </h2>
                <span className="cms-hint">
                  Review applicant profiles, motivation letters, venture stages, evaluate cohort fit, and generate email lists.
                </span>
              </div>

              {/* Email List Actions */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="cms-btn cms-btn-primary"
                  title="Generate email list of current candidates"
                >
                  📋 Generate Email List ({filteredPipeline.length})
                </button>
                <button
                  onClick={() => exportApplicantsCSV(filteredPipeline, "abcn-pipeline-export")}
                  className="cms-btn cms-btn-secondary"
                  title="Download CSV spreadsheet"
                >
                  📥 Export CSV
                </button>
                <button
                  onClick={() => openGroupEmail(filteredPipeline)}
                  className="cms-btn cms-btn-gold"
                  title="Open mailto client with candidates in BCC"
                >
                  ✉️ Email Cohort
                </button>
              </div>
            </div>

            {/* Pipeline Filtering Toolbar */}
            <div className="cms-pipeline-toolbar">
              <div className="cms-pipeline-actions-left">
                <input
                  type="text"
                  placeholder="Search founder, venture or email…"
                  value={pipelineSearch}
                  onChange={(e) => setPipelineSearch(e.target.value)}
                  style={{
                    padding: "8px 14px",
                    background: "var(--cms-bg)",
                    border: "1px solid var(--cms-border)",
                    borderRadius: "var(--cms-radius-sm)",
                    color: "#fff",
                    fontSize: "0.85rem",
                    minWidth: "260px",
                  }}
                />

                <select
                  value={pipelineEventFilter}
                  onChange={(e) => setPipelineEventFilter(e.target.value)}
                  className="cms-status-select"
                >
                  <option value="all">All Programmes ({allApplications.length})</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="cms-pipeline-actions-right">
                <div className="cms-filter-pills" style={{ background: "transparent", border: "none", padding: 0 }}>
                  {["all", "submitted", "reviewing", "shortlisted", "accepted", "declined"].map((st) => (
                    <button
                      key={st}
                      className={`cms-filter-btn ${pipelineStatusFilter === st ? "active" : ""}`}
                      onClick={() => setPipelineStatusFilter(st)}
                    >
                      {st === "all" ? "All Statuses" : st.charAt(0).toUpperCase() + st.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {applicationsLoading ? (
              <div style={{ padding: "4rem", textAlign: "center", color: "var(--cms-text-secondary)" }}>
                Loading founder pipeline…
              </div>
            ) : filteredPipeline.length === 0 ? (
              <div style={{ padding: "4rem", textAlign: "center", color: "var(--cms-text-muted)" }}>
                No candidate applications match the selected filters.
              </div>
            ) : (
              <table className="cms-table">
                <thead>
                  <tr>
                    <th>Founder Candidate</th>
                    <th>Venture & Stage</th>
                    <th>Programme</th>
                    <th>Location</th>
                    <th>Submission Date</th>
                    <th>Review Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPipeline.map((app) => (
                    <tr key={app.id}>
                      <td>
                        <span className="cms-applicant-name">
                          {app.first_name} {app.last_name}
                        </span>
                        <span className="cms-applicant-sub">{app.email}</span>
                      </td>
                      <td>
                        <strong>{app.company_name || "Venture Not Named"}</strong>
                        <span className="cms-applicant-sub" style={{ display: "block" }}>
                          {app.venture_stage || "Stage TBA"}
                        </span>
                      </td>
                      <td>{app.event_title || "General Application"}</td>
                      <td>
                        {app.city || "City TBA"}, {app.country || "Country TBA"}
                      </td>
                      <td>{new Date(app.submitted_at).toLocaleDateString()}</td>
                      <td>
                        <select
                          className="cms-status-select"
                          value={app.status}
                          onChange={(e) => updateApplicationStatus(app.id, e.target.value)}
                        >
                          <option value="submitted">Submitted</option>
                          <option value="reviewing">In Review</option>
                          <option value="shortlisted">Shortlisted</option>
                          <option value="accepted">Accepted</option>
                          <option value="declined">Declined</option>
                        </select>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={() => setSelectedApplicant(app)}
                            className="cms-btn cms-btn-primary"
                            style={{ padding: "5px 10px", fontSize: "0.75rem" }}
                          >
                            Inspect Profile
                          </button>
                          <button
                            onClick={() => deleteApplication(app.id)}
                            className="cms-btn cms-btn-danger"
                            style={{ padding: "5px 10px", fontSize: "0.75rem" }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ---------------- Full-Screen Candidate Form Response Dossier ---------------- */}
        {selectedApplicant && (
          <div className="cms-applicant-fullscreen" role="dialog" aria-modal="true">
            {/* Top Header Bar */}
            <header className="cms-fullscreen-header">
              <div className="cms-fullscreen-header-left">
                <button
                  type="button"
                  onClick={() => setSelectedApplicant(null)}
                  className="cms-fullscreen-back-btn"
                  title="Close and return to list (Esc)"
                >
                  <span>←</span>
                  <span>Back to Responses</span>
                  <kbd style={{ opacity: 0.6, fontSize: "0.7rem", padding: "1px 4px", border: "1px solid var(--cms-border)", borderRadius: "3px" }}>Esc</kbd>
                </button>

                <div className="cms-fullscreen-divider" />

                <div className="cms-fullscreen-title-group">
                  <div className="cms-fullscreen-avatar">
                    {selectedApplicant.first_name?.[0] || ""}{selectedApplicant.last_name?.[0] || "A"}
                  </div>
                  <div className="cms-fullscreen-heading-text">
                    <h2 className="cms-fullscreen-heading-title">
                      {selectedApplicant.first_name} {selectedApplicant.last_name}
                      {selectedApplicant.company_name && (
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--cms-accent)" }}>
                          ({selectedApplicant.company_name})
                        </span>
                      )}
                    </h2>
                    <div className="cms-fullscreen-heading-sub">
                      <span>{selectedApplicant.role_title || "Founder"}</span>
                      {selectedApplicant.city && (
                        <>
                          <span>•</span>
                          <span>📍 {selectedApplicant.city}{selectedApplicant.country ? `, ${selectedApplicant.country}` : ""}</span>
                        </>
                      )}
                      {selectedApplicant.event_title && (
                        <>
                          <span>•</span>
                          <span style={{ color: "var(--cms-gold)", fontWeight: 600 }}>🏷 {selectedApplicant.event_title}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Center Navigation Controls */}
              <div className="cms-fullscreen-nav-controls">
                <button
                  type="button"
                  disabled={currentApplicantIndex <= 0}
                  onClick={() => {
                    if (currentApplicantIndex > 0) {
                      setSelectedApplicant(activeApplicantList[currentApplicantIndex - 1]);
                    }
                  }}
                  className="cms-fullscreen-nav-btn"
                  title="Previous response (Left Arrow)"
                >
                  ◀ Prev
                </button>
                <span className="cms-fullscreen-nav-counter">
                  {currentApplicantIndex >= 0 ? `${currentApplicantIndex + 1} of ${activeApplicantList.length}` : `${activeApplicantList.length} total`}
                </span>
                <button
                  type="button"
                  disabled={currentApplicantIndex < 0 || currentApplicantIndex >= activeApplicantList.length - 1}
                  onClick={() => {
                    if (currentApplicantIndex >= 0 && currentApplicantIndex < activeApplicantList.length - 1) {
                      setSelectedApplicant(activeApplicantList[currentApplicantIndex + 1]);
                    }
                  }}
                  className="cms-fullscreen-nav-btn"
                  title="Next response (Right Arrow)"
                >
                  Next ▶
                </button>
              </div>

              {/* Right Side Actions */}
              <div className="cms-fullscreen-header-right">
                <div className="cms-fullscreen-status-wrap">
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--cms-text-muted)" }}>Status:</span>
                  <select
                    className="cms-fullscreen-status-select"
                    data-status={selectedApplicant.status}
                    value={selectedApplicant.status}
                    onChange={(e) => updateApplicationStatus(selectedApplicant.id, e.target.value)}
                  >
                    <option value="submitted">📥 Submitted</option>
                    <option value="reviewing">🔍 In Review</option>
                    <option value="shortlisted">⭐ Shortlisted</option>
                    <option value="accepted">✓ Accepted</option>
                    <option value="declined">✕ Declined</option>
                  </select>
                </div>

                <a
                  href={`mailto:${selectedApplicant.email}?subject=${encodeURIComponent(`ABCN Executive Update: ${selectedApplicant.first_name} ${selectedApplicant.last_name}`)}`}
                  className="cms-fullscreen-action-btn"
                  title="Send email to founder"
                >
                  ✉ Email
                </a>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="cms-fullscreen-action-btn"
                  title="Print / Save PDF Dossier"
                >
                  🖨 Print Dossier
                </button>

                <button
                  type="button"
                  onClick={() => deleteApplication(selectedApplicant.id)}
                  className="cms-fullscreen-action-btn"
                  style={{ color: "var(--cms-danger)" }}
                  title="Delete Application"
                >
                  🗑 Delete
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedApplicant(null)}
                  className="cms-fullscreen-close-btn"
                  title="Close (Esc)"
                >
                  ✕
                </button>
              </div>
            </header>

            {/* Scrollable Dossier Body */}
            <div className="cms-fullscreen-scroll">
              <div className="cms-fullscreen-inner">
                {/* Main Left Column: Primary Question Responses */}
                <div className="cms-response-main">
                  {/* Quick Metrics Strip */}
                  <div className="cms-dossier-metrics-grid">
                    <div className="cms-dossier-metric-item">
                      <span className="cms-dossier-metric-label">Submitted On</span>
                      <span className="cms-dossier-metric-value">
                        {selectedApplicant.submitted_at
                          ? new Date(selectedApplicant.submitted_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Unknown"}
                      </span>
                    </div>

                    <div className="cms-dossier-metric-item">
                      <span className="cms-dossier-metric-label">Venture Stage</span>
                      <span className="cms-dossier-metric-value" style={{ color: "var(--cms-gold)" }}>
                        {selectedApplicant.venture_stage || "Not specified"}
                      </span>
                    </div>

                    <div className="cms-dossier-metric-item">
                      <span className="cms-dossier-metric-label">Industry / Focus</span>
                      <span className="cms-dossier-metric-value" style={{ color: "var(--cms-accent)" }}>
                        {selectedApplicant.business_model || "General"}
                      </span>
                    </div>

                    <div className="cms-dossier-metric-item">
                      <span className="cms-dossier-metric-label">Grant Interest</span>
                      <span className="cms-dossier-metric-value">
                        {selectedApplicant.goals || "Standard"}
                      </span>
                    </div>
                  </div>

                  {/* 1. Founder Motivation */}
                  <div className="cms-dossier-card">
                    <div className="cms-dossier-card-head">
                      <h3 className="cms-dossier-card-title">
                        <span>🎯</span> Founder Motivation & Vision
                      </h3>
                      <span className="cms-dossier-badge">Key Essay Response</span>
                    </div>
                    {selectedApplicant.motivation ? (
                      <div className="cms-dossier-prose">
                        {selectedApplicant.motivation}
                      </div>
                    ) : (
                      <p style={{ color: "var(--cms-text-muted)", fontStyle: "italic", margin: 0 }}>
                        No motivation statement was submitted with this application.
                      </p>
                    )}
                  </div>

                  {/* 2. Business Model, Innovation & Goals */}
                  <div className="cms-dossier-card">
                    <div className="cms-dossier-card-head">
                      <h3 className="cms-dossier-card-title">
                        <span>💡</span> Venture Architecture & Objectives
                      </h3>
                      <span className="cms-dossier-badge">Commercial Profile</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1rem" }}>
                      <div>
                        <span className="cms-hint" style={{ display: "block", marginBottom: "4px" }}>
                          Business Model / Sector
                        </span>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                          {selectedApplicant.business_model || "Not specified"}
                        </div>
                      </div>

                      <div>
                        <span className="cms-hint" style={{ display: "block", marginBottom: "4px" }}>
                          Venture Stage
                        </span>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                          {selectedApplicant.venture_stage || "Not specified"}
                        </div>
                      </div>
                    </div>

                    {selectedApplicant.goals && (
                      <div style={{ marginTop: "1rem" }}>
                        <span className="cms-hint" style={{ display: "block", marginBottom: "6px" }}>
                          Programme Goals & Financial Grant Ambitions
                        </span>
                        <div className="cms-dossier-prose" style={{ borderLeftColor: "var(--cms-gold)" }}>
                          {selectedApplicant.goals}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. AI & Digitalization Strategy */}
                  <div className="cms-dossier-card">
                    <div className="cms-dossier-card-head">
                      <h3 className="cms-dossier-card-title">
                        <span>🤖</span> AI, Digitalization & Scaling Strategy
                      </h3>
                      <span className="cms-dossier-badge">Tech Transformation</span>
                    </div>
                    {selectedApplicant.ai_interest ? (
                      <div className="cms-dossier-prose" style={{ borderLeftColor: "var(--cms-blue)" }}>
                        {selectedApplicant.ai_interest}
                      </div>
                    ) : (
                      <p style={{ color: "var(--cms-text-muted)", fontStyle: "italic", margin: 0 }}>
                        No specific AI/digitalization notes provided.
                      </p>
                    )}
                  </div>

                  {/* 4. Internal Reviewer Notes & Decision Center */}
                  <div className="cms-dossier-card" style={{ borderColor: "rgba(88, 172, 140, 0.35)" }}>
                    <div className="cms-dossier-card-head">
                      <h3 className="cms-dossier-card-title">
                        <span>📝</span> Executive Reviewer Notes & Scoring
                      </h3>
                      <span className="cms-dossier-badge" style={{ background: "rgba(229, 184, 105, 0.15)", color: "var(--cms-gold)" }}>
                        Private Internal
                      </span>
                    </div>

                    <p className="cms-hint" style={{ marginBottom: "0.75rem" }}>
                      Private evaluation notes, jury scoring, background verification notes, or interview observations. Auto-saved immediately on edit.
                    </p>

                    <textarea
                      rows={5}
                      defaultValue={selectedApplicant.admin_notes || ""}
                      placeholder="Add evaluation comments, jury score, pitch feedback, or follow-up notes here…"
                      style={{
                        width: "100%",
                        padding: "1rem",
                        fontSize: "0.92rem",
                        lineHeight: 1.6,
                        background: "var(--cms-input-bg)",
                        border: "1px solid var(--cms-border)",
                        borderRadius: "var(--cms-radius-sm)",
                        color: "var(--cms-text-primary)",
                      }}
                      onBlur={(e) =>
                        updateApplicationStatus(
                          selectedApplicant.id,
                          selectedApplicant.status,
                          e.target.value
                        )
                      }
                    />

                    <div style={{ marginTop: "10px" }}>
                      <span className="cms-hint" style={{ display: "block", marginBottom: "4px" }}>
                        Quick Reviewer Tags (Click to append):
                      </span>
                      <div className="cms-quick-tag-row">
                        <button
                          type="button"
                          onClick={() => appendAdminNote("High Potential Founder")}
                          className="cms-quick-tag-btn"
                        >
                          + High Potential
                        </button>
                        <button
                          type="button"
                          onClick={() => appendAdminNote("Shortlist for Pitch")}
                          className="cms-quick-tag-btn"
                        >
                          + Shortlist for Pitch
                        </button>
                        <button
                          type="button"
                          onClick={() => appendAdminNote("Strong Market Fit")}
                          className="cms-quick-tag-btn"
                        >
                          + Strong Market Fit
                        </button>
                        <button
                          type="button"
                          onClick={() => appendAdminNote("Grand Prize Candidate")}
                          className="cms-quick-tag-btn"
                        >
                          + Grand Prize Candidate
                        </button>
                        <button
                          type="button"
                          onClick={() => appendAdminNote("Grant Candidate")}
                          className="cms-quick-tag-btn"
                        >
                          + Grant Candidate
                        </button>
                        <button
                          type="button"
                          onClick={() => appendAdminNote("Schedule Screening Interview")}
                          className="cms-quick-tag-btn"
                        >
                          + Schedule Interview
                        </button>
                        <button
                          type="button"
                          onClick={() => appendAdminNote("Follow-up on Deck")}
                          className="cms-quick-tag-btn"
                        >
                          + Request Deck
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Founder & Venture Dossier */}
                <div className="cms-dossier-sidebar">
                  {/* Founder Profile Card */}
                  <div className="cms-dossier-card">
                    <div className="cms-dossier-profile-hero">
                      <div className="cms-dossier-profile-avatar">
                        {selectedApplicant.first_name?.[0] || ""}{selectedApplicant.last_name?.[0] || "A"}
                      </div>
                      <h3 className="cms-dossier-profile-name">
                        {selectedApplicant.first_name} {selectedApplicant.last_name}
                      </h3>
                      <div className="cms-dossier-profile-role">
                        {selectedApplicant.role_title || "Founder"} · {selectedApplicant.company_name || "Venture"}
                      </div>
                      <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "10px" }}>
                        <a
                          href={`mailto:${selectedApplicant.email}`}
                          className="cms-btn cms-btn-primary"
                          style={{ fontSize: "0.8rem", padding: "6px 14px" }}
                        >
                          ✉ Send Email
                        </a>
                        <button
                          type="button"
                          onClick={() => copyTextToClipboard(selectedApplicant.email, "Email")}
                          className="cms-btn cms-btn-secondary"
                          style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                        >
                          ⎘ Copy
                        </button>
                      </div>
                    </div>

                    <div className="cms-dossier-field-row">
                      <span className="cms-dossier-field-key">Email Address</span>
                      <span className="cms-dossier-field-val">
                        <a
                          href={`mailto:${selectedApplicant.email}`}
                          style={{ color: "var(--cms-accent)", textDecoration: "none" }}
                        >
                          {selectedApplicant.email}
                        </a>
                      </span>
                    </div>

                    <div className="cms-dossier-field-row">
                      <span className="cms-dossier-field-key">Phone Number</span>
                      <span className="cms-dossier-field-val">
                        {selectedApplicant.phone ? (
                          <a
                            href={`tel:${selectedApplicant.phone}`}
                            style={{ color: "var(--cms-text-primary)", textDecoration: "none" }}
                          >
                            {selectedApplicant.phone}
                          </a>
                        ) : (
                          <span style={{ color: "var(--cms-text-muted)" }}>Not provided</span>
                        )}
                      </span>
                    </div>

                    <div className="cms-dossier-field-row">
                      <span className="cms-dossier-field-key">Location</span>
                      <span className="cms-dossier-field-val">
                        📍 {selectedApplicant.city || "City TBA"}, {selectedApplicant.country || "DE"}
                      </span>
                    </div>

                    <div className="cms-dossier-field-row">
                      <span className="cms-dossier-field-key">GDPR Consent</span>
                      <span className="cms-dossier-field-val" style={{ color: "var(--cms-accent)" }}>
                        ✓ Verified & Opted-in
                      </span>
                    </div>
                  </div>

                  {/* Venture Dossier Card */}
                  <div className="cms-dossier-card">
                    <div className="cms-dossier-card-head">
                      <h4 className="cms-dossier-card-title">
                        <span>🏢</span> Company Information
                      </h4>
                    </div>

                    <div className="cms-dossier-field-row">
                      <span className="cms-dossier-field-key">Company Name</span>
                      <span className="cms-dossier-field-val" style={{ fontWeight: 700 }}>
                        {selectedApplicant.company_name || "Not registered yet"}
                      </span>
                    </div>

                    <div className="cms-dossier-field-row">
                      <span className="cms-dossier-field-key">Website / Portfolio</span>
                      <span className="cms-dossier-field-val">
                        {selectedApplicant.company_website ? (
                          <a
                            href={
                              selectedApplicant.company_website.startsWith("http")
                                ? selectedApplicant.company_website
                                : `https://${selectedApplicant.company_website}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "var(--cms-accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            Visit Site ↗
                          </a>
                        ) : (
                          <span style={{ color: "var(--cms-text-muted)" }}>No link provided</span>
                        )}
                      </span>
                    </div>

                    <div className="cms-dossier-field-row">
                      <span className="cms-dossier-field-key">Venture Stage</span>
                      <span className="cms-dossier-field-val" style={{ color: "var(--cms-gold)", fontWeight: 700 }}>
                        {selectedApplicant.venture_stage || "Early stage"}
                      </span>
                    </div>

                    <div className="cms-dossier-field-row">
                      <span className="cms-dossier-field-key">Target Programme</span>
                      <span className="cms-dossier-field-val">
                        {selectedApplicant.event_title || "FIALI Summit 2026"}
                      </span>
                    </div>

                    {selectedApplicant.referral_source && (
                      <div className="cms-dossier-field-row">
                        <span className="cms-dossier-field-key">Discovery Source</span>
                        <span className="cms-dossier-field-val">
                          {selectedApplicant.referral_source}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Audit Trail Card */}
                  <div className="cms-dossier-card">
                    <div className="cms-dossier-card-head">
                      <h4 className="cms-dossier-card-title">
                        <span>🛡️</span> Application Record
                      </h4>
                    </div>

                    <div className="cms-dossier-field-row">
                      <span className="cms-dossier-field-key">Record ID</span>
                      <span className="cms-dossier-field-val" style={{ fontSize: "0.75rem", fontFamily: "monospace" }}>
                        <button
                          type="button"
                          onClick={() => copyTextToClipboard(selectedApplicant.id, "Application ID")}
                          className="cms-icon-btn"
                          style={{ width: "auto", height: "auto", padding: "2px 6px", fontSize: "0.72rem", border: "1px solid var(--cms-border)", borderRadius: "3px" }}
                          title="Copy UUID"
                        >
                          {selectedApplicant.id.slice(0, 8)}... ⎘
                        </button>
                      </span>
                    </div>

                    <div className="cms-dossier-field-row">
                      <span className="cms-dossier-field-key">Timestamp (UTC)</span>
                      <span className="cms-dossier-field-val" style={{ fontSize: "0.78rem" }}>
                        {selectedApplicant.submitted_at || "—"}
                      </span>
                    </div>

                    <div className="cms-dossier-field-row">
                      <span className="cms-dossier-field-key">Review Pipeline</span>
                      <span className="cms-dossier-field-val">
                        <span className={`cms-status-badge ${selectedApplicant.status}`} style={{ textTransform: "capitalize" }}>
                          {selectedApplicant.status}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Email List Export Modal ---------------- */}
        {showEmailModal && (
          <div className="cms-email-modal-overlay">
            <div className="cms-email-modal-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: "1.3rem", fontWeight: 800 }}>
                    Export / Copy Candidate Email List
                  </h3>
                  <span className="cms-hint">
                    Select a format to copy {filteredPipeline.length} candidate emails for your mailing list or email client.
                  </span>
                </div>
                <button onClick={() => setShowEmailModal(false)} className="cms-icon-btn">
                  ✕
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", margin: "1.5rem 0" }}>
                <button
                  onClick={() => copyEmailList(filteredPipeline, "comma")}
                  className="cms-btn cms-btn-secondary"
                  style={{ justifyContent: "flex-start", padding: "12px 16px" }}
                >
                  📋 Copy Comma-Separated Emails (BCC Format)
                  <span style={{ marginLeft: "auto", opacity: 0.6, fontSize: "0.75rem" }}>
                    email1@..., email2@...
                  </span>
                </button>

                <button
                  onClick={() => copyEmailList(filteredPipeline, "named")}
                  className="cms-btn cms-btn-secondary"
                  style={{ justifyContent: "flex-start", padding: "12px 16px" }}
                >
                  👤 Copy Named Recipients Format
                  <span style={{ marginLeft: "auto", opacity: 0.6, fontSize: "0.75rem" }}>
                    &quot;Jane Doe&quot; &lt;email@...&gt;
                  </span>
                </button>

                <button
                  onClick={() => copyEmailList(filteredPipeline, "newline")}
                  className="cms-btn cms-btn-secondary"
                  style={{ justifyContent: "flex-start", padding: "12px 16px" }}
                >
                  📄 Copy Line-by-Line (Newsletter Import)
                  <span style={{ marginLeft: "auto", opacity: 0.6, fontSize: "0.75rem" }}>
                    One per line
                  </span>
                </button>

                <button
                  onClick={() => exportApplicantsCSV(filteredPipeline, "abcn-pipeline-export")}
                  className="cms-btn cms-btn-primary"
                  style={{ justifyContent: "center", padding: "12px 16px", marginTop: "0.5rem" }}
                >
                  📥 Download Full CSV Spreadsheet
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => setShowEmailModal(false)} className="cms-btn cms-btn-secondary">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Deletion Confirm Modal ---------------- */}
        {confirmDeleteId && (
          <div className="cms-email-modal-overlay">
            <div className="cms-email-modal-card" style={{ maxWidth: "460px" }}>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.3rem", fontWeight: 800, color: "var(--cms-danger)" }}>
                Permanently Delete Event?
              </h3>
              <p style={{ fontSize: "0.88rem", color: "var(--cms-text-secondary)", lineHeight: 1.5 }}>
                Are you sure you want to permanently delete <strong>{form.title}</strong>? This action cannot be undone and will also remove any related founder application records.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "1.5rem" }}>
                <button onClick={() => setConfirmDeleteId(null)} className="cms-btn cms-btn-secondary">
                  Cancel
                </button>
                <button onClick={confirmAndRemoveEvent} className="cms-btn cms-btn-danger">
                  Yes, Delete Event
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 3: WEBSITE PARTNERS MANAGER (GLOBAL ABCN PARTNERS)
            ========================================================================= */}
        {mainTab === "partners" && (
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
                <h2 style={{ margin: 0, fontSize: "1.3rem" }}>Website Partners & Ecosystem</h2>
                <p className="cms-hint" style={{ margin: "4px 0 0" }}>
                  Manage the verified partners, logos, and ecosystem collaborators displayed across the public ABCN website and ticker.
                </p>
              </div>
              <button
                className="cms-btn cms-btn-primary"
                onClick={() => {
                  setPartnerForm({
                    name: "",
                    logo_url: "",
                    website_url: "",
                    category: "Strategic Partner",
                    description: "",
                    priority: 10,
                    active: true,
                  });
                  setPartnerModalOpen(true);
                }}
              >
                + Add Website Partner
              </button>
            </div>

            {sitePartnersLoading ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--cms-text-muted)" }}>
                Loading website partners…
              </div>
            ) : sitePartners.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center" }}>
                <p>No website partners configured yet.</p>
              </div>
            ) : (
              <div className="cms-site-partners-grid">
                {sitePartners.map((partner) => (
                  <div className="cms-site-partner-card" key={partner.id || partner.name}>
                    <div className="cms-site-partner-top">
                      <div className="cms-site-partner-logo">
                        {partner.logo_url ? (
                          <img src={partner.logo_url} alt={partner.name} />
                        ) : (
                          <span style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                            {partner.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="cms-site-partner-info">
                        <h3>{partner.name}</h3>
                        <span className="cms-site-partner-category">{partner.category || "Partner"}</span>
                      </div>
                      <span className={`cms-pill ${partner.active ? "published" : "draft"}`}>
                        {partner.active ? "Active" : "Hidden"}
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.82rem" }}>
                      {partner.website_url && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ color: "var(--cms-text-muted)" }}>Link:</span>
                          <a
                            href={partner.website_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "var(--cms-accent)", textDecoration: "underline" }}
                          >
                            {partner.website_url.replace(/^https?:\/\//, '')} ↗
                          </a>
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ color: "var(--cms-text-muted)" }}>Priority Order:</span>
                        <strong>{partner.priority ?? 0}</strong>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto", paddingTop: "0.75rem", borderTop: "1px solid var(--cms-border)" }}>
                      <button
                        className="cms-btn cms-btn-secondary"
                        style={{ flex: 1, fontSize: "0.75rem", padding: "6px" }}
                        onClick={() => togglePartnerActive(partner)}
                      >
                        {partner.active ? "Hide on Site" : "Show on Site"}
                      </button>
                      <button
                        className="cms-btn cms-btn-secondary"
                        style={{ flex: 1, fontSize: "0.75rem", padding: "6px" }}
                        onClick={() => {
                          setPartnerForm({ ...partner });
                          setPartnerModalOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="cms-icon-btn danger"
                        title="Delete partner"
                        onClick={() => partner.id && deleteSitePartner(partner.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            VIEW 4: MEDIA & GLOBAL ASSET LIBRARY
            ========================================================================= */}
        {mainTab === "slideshow" && <SlideshowManager notify={showToast} />}

        {mainTab === "media" && (
          <div className="cms-panel" style={{ padding: "1.5rem" }}>
            <div style={{ paddingBottom: "1rem", borderBottom: "1px solid var(--cms-border)" }}>
              <h2 style={{ margin: 0, fontSize: "1.3rem" }}>Media & Global Asset Manager</h2>
              <p className="cms-hint" style={{ margin: "4px 0 0" }}>
                Upload, compress, and inspect media assets for your events, spotlight banners, and website sections.
              </p>
            </div>

            {/* Quick Upload Dropzone */}
            <div style={{ marginTop: "1.5rem" }}>
              <div
                className="cms-image-upload-zone"
                onClick={() => document.getElementById("asset-upload-file")?.click()}
                style={{ padding: "2.5rem 1.5rem" }}
              >
                <input
                  id="asset-upload-file"
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    showToast("Compressing image...");
                    try {
                      const c = await compressImage(f);
                      setMediaUploadPreview(c);
                      navigator.clipboard.writeText(c);
                      showToast("Image compressed & data copied to clipboard! Paste directly into any event image field.");
                    } catch (err: any) {
                      showToast(err.message || "Compression error", "error");
                    }
                  }}
                />
                <div style={{ fontSize: "2.2rem", marginBottom: "0.5rem" }}>⚡</div>
                <strong style={{ fontSize: "1.05rem" }}>Upload Any Image to Compress & Copy Data URL</strong>
                <p className="cms-hint" style={{ marginTop: "4px" }}>
                  Optimizes PNG/JPEG photos automatically for ultra-fast database storage or instant usage.
                </p>
              </div>

              {mediaUploadPreview && (
                <div style={{ marginTop: "1rem", padding: "1rem", background: "var(--cms-surface)", border: "1px solid var(--cms-border)", borderRadius: "var(--cms-radius-md)" }}>
                  <strong>Uploaded Image Preview:</strong>
                  <div style={{ maxHeight: "240px", overflow: "hidden", borderRadius: "var(--cms-radius-sm)", marginTop: "0.5rem" }}>
                    <img src={mediaUploadPreview} alt="Uploaded asset preview" style={{ maxWidth: "100%", maxHeight: "240px", objectFit: "contain" }} />
                  </div>
                  <button
                    className="cms-btn cms-btn-primary"
                    style={{ marginTop: "0.75rem", fontSize: "0.8rem" }}
                    onClick={() => {
                      navigator.clipboard.writeText(mediaUploadPreview);
                      showToast("Copied image data URL to clipboard!");
                    }}
                  >
                    📋 Copy Image Data URL Again
                  </button>
                </div>
              )}
            </div>

            {/* Curated Pre-Loaded ABCN & FIALI Assets */}
            <div style={{ marginTop: "2rem" }}>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Curated Site & Event Image Assets</h3>
              <p className="cms-hint" style={{ marginBottom: "1rem" }}>
                Click "Copy Path" on any verified asset to paste directly into your Hero, Card, or Gallery fields.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
                {[
                  { name: "Alumni Welcome Stage", path: "/assets/abcn/events/alumni-welcome-stage.jpg", category: "Community" },
                  { name: "Female Founders Lineup", path: "/assets/abcn/events/female-founders-lineup.jpg", category: "Summit" },
                  { name: "Mentorship Conversation", path: "/assets/abcn/events/mentorship-conversation.jpg", category: "Mentorship" },
                  { name: "Sales Elevate Lab", path: "/assets/abcn/events/sales-elevate-lab-certificates.jpg", category: "Workshops" },
                  { name: "Rooftop Meetup", path: "/assets/abcn/events/rooftop-terrace-group.jpg", category: "Community" },
                  { name: "Networking Evening", path: "/assets/abcn/events/networking-evening-group.jpg", category: "Networking" },
                  { name: "Women's Day", path: "/assets/abcn/events/international-womens-day.jpg", category: "Community" },
                  { name: "Harmonie Essome (Programme Lead)", path: "/assets/abcn/events/harmonie-programme-lead.jpg", category: "Leadership" },
                  { name: "ABCN Official Logo", path: "/assets/abcn/abcn-logo.png", category: "Brand" },
                ].map((asset) => (
                  <div key={asset.path} className="cms-gallery-card">
                    <div style={{ height: "130px", overflow: "hidden", borderRadius: "var(--cms-radius-sm)", background: "rgba(0,0,0,0.2)" }}>
                      <img src={asset.path} alt={asset.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div>
                      <strong style={{ fontSize: "0.85rem", display: "block" }}>{asset.name}</strong>
                      <code style={{ fontSize: "0.72rem", color: "var(--cms-accent)" }}>{asset.path}</code>
                    </div>
                    <button
                      className="cms-btn cms-btn-secondary"
                      style={{ fontSize: "0.75rem", padding: "5px 8px", marginTop: "auto" }}
                      onClick={() => {
                        navigator.clipboard.writeText(asset.path);
                        showToast(`Copied ${asset.path} to clipboard!`);
                      }}
                    >
                      📋 Copy Asset Path
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---------------- Website Partner Modal ---------------- */}
      {partnerModalOpen && (
        <div className="cms-email-modal-overlay" onClick={() => setPartnerModalOpen(false)}>
          <div className="cms-email-modal-card" style={{ maxWidth: "540px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem" }}>
                {partnerForm.id ? "Edit Website Partner" : "Add Website Partner"}
              </h3>
              <button className="cms-icon-btn" onClick={() => setPartnerModalOpen(false)}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="cms-field">
                <label>Partner Organization Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mountain Hub"
                  value={partnerForm.name}
                  onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                />
              </div>

              <div className="cms-field">
                <label>Category / Partnership Tier</label>
                <select
                  value={partnerForm.category || "Strategic Partner"}
                  onChange={(e) => setPartnerForm({ ...partnerForm, category: e.target.value })}
                >
                  <option value="Technology Partner">Technology Partner</option>
                  <option value="Strategic Partner">Strategic Partner</option>
                  <option value="Institutional Partner">Institutional Partner</option>
                  <option value="Community Partner">Community Partner</option>
                  <option value="Ecosystem Partner">Ecosystem Partner</option>
                  <option value="Media Partner">Media Partner</option>
                </select>
              </div>

              <div className="cms-field">
                <label>Partner Logo (Upload or URL)</label>
                <div
                  className="cms-image-upload-zone"
                  onClick={() => document.getElementById("partner-logo-file")?.click()}
                  style={{ padding: "1.25rem 1rem" }}
                >
                  <input
                    id="partner-logo-file"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      showToast("Compressing partner logo...");
                      try {
                        const c = await compressImage(f);
                        setPartnerForm({ ...partnerForm, logo_url: c });
                        showToast("Logo attached!");
                      } catch (err: any) {
                        showToast(err.message || "Logo upload failed", "error");
                      }
                    }}
                  />
                  <span>📤 Click to upload logo image</span>
                </div>
                {partnerForm.logo_url && (
                  <div style={{ height: "60px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--cms-border)", borderRadius: "var(--cms-radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", marginTop: "0.5rem" }}>
                    <img src={partnerForm.logo_url} alt="Logo preview" style={{ maxHeight: "50px", maxWidth: "90%", objectFit: "contain" }} />
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Or enter image URL / asset path: /assets/fiali/logos/..."
                  value={partnerForm.logo_url || ""}
                  onChange={(e) => setPartnerForm({ ...partnerForm, logo_url: e.target.value })}
                  style={{ marginTop: "0.5rem" }}
                />
              </div>

              <div className="cms-field">
                <label>Website URL (Optional)</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={partnerForm.website_url || ""}
                    onChange={(e) => setPartnerForm({ ...partnerForm, website_url: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  {partnerForm.website_url && (
                    <a
                      href={partnerForm.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="cms-btn cms-btn-secondary"
                      style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}
                    >
                      Test Link ↗
                    </a>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="cms-field">
                  <label>Display Priority</label>
                  <input
                    type="number"
                    value={partnerForm.priority ?? 10}
                    onChange={(e) => setPartnerForm({ ...partnerForm, priority: Number(e.target.value) || 0 })}
                  />
                  <span className="cms-hint">Higher number displays first</span>
                </div>

                <div className="cms-switch-row" style={{ marginTop: "1.2rem" }}>
                  <div className="cms-switch-info">
                    <strong>Active on Website</strong>
                  </div>
                  <label className="cms-switch-control">
                    <input
                      type="checkbox"
                      checked={Boolean(partnerForm.active)}
                      onChange={(e) => setPartnerForm({ ...partnerForm, active: e.target.checked })}
                    />
                    <span className="cms-slider" />
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  className="cms-btn cms-btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setPartnerModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="cms-btn cms-btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => saveSitePartner(partnerForm)}
                >
                  Save Partner
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Status Toast */}
      {toast && <div className={`cms-toast ${toast.type}`}>{toast.text}</div>}
      </div>
    </div>
  );
}
