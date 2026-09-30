import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { FILE_EXTENSIONS, MAX_FILE_BYTES, parseForm } from "@/lib/application-form";

export const dynamic = "force-dynamic";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  csv: "text/csv",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

/** The file's first bytes must match what its extension claims. */
function contentMatches(ext: string, b: Buffer): boolean {
  const starts = (...sig: number[]) => sig.every((x, i) => b[i] === x);
  switch (ext) {
    case "pdf": return starts(0x25, 0x50, 0x44, 0x46); // %PDF
    case "png": return starts(0x89, 0x50, 0x4e, 0x47);
    case "jpg":
    case "jpeg": return starts(0xff, 0xd8, 0xff);
    case "docx":
    case "pptx":
    case "xlsx": return starts(0x50, 0x4b); // zip container
    case "doc":
    case "ppt":
    case "xls": return starts(0xd0, 0xcf, 0x11, 0xe0);
    default: return !b.subarray(0, 4096).includes(0); // txt/csv: plain text, no NUL bytes
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const eventId = String(form.get("eventId") || "");
    const fieldId = String(form.get("fieldId") || "");
    if (!(file instanceof File) || !eventId || !fieldId) return fail("Missing file, event or question.");

    // The question must exist on this event's form and be a file question.
    const ev = await query<{ application_form: unknown }>(
      "SELECT application_form FROM events WHERE id = $1 LIMIT 1",
      [eventId]
    );
    const schema = parseForm(ev[0]?.application_form);
    const field = schema?.steps.flatMap((s) => s.fields).find((f) => f.id === fieldId);
    if (!field || field.type !== "file") return fail("This question does not accept files.", 403);

    if (file.size === 0) return fail("The file is empty.");
    if (file.size > MAX_FILE_BYTES) return fail(`The file is too large. The limit is ${MAX_FILE_BYTES / 1024 / 1024} MB.`, 413);

    const name = file.name.replace(/[\\/\r\n"]/g, "_").slice(0, 200) || "file";
    const ext = (name.split(".").pop() || "").toLowerCase();
    if (!FILE_EXTENSIONS.includes(ext)) {
      return fail(`This file type is not accepted. Allowed: ${FILE_EXTENSIONS.join(", ")}.`, 415);
    }
    const buf = Buffer.from(await file.arrayBuffer());
    if (!contentMatches(ext, buf)) return fail("The file content does not match its type.", 415);

    // Housekeeping + abuse guard: drop abandoned uploads, cap how many can wait.
    await query("DELETE FROM application_files WHERE application_id IS NULL AND created_at < NOW() - INTERVAL '1 day'");
    const pending = await query<{ n: string }>(
      "SELECT COUNT(*) AS n FROM application_files WHERE application_id IS NULL AND event_id = $1",
      [eventId]
    );
    if (Number(pending[0]?.n || 0) >= 150) return fail("Too many uploads right now. Please try again later.", 429);

    const rows = await query<{ id: string }>(
      `INSERT INTO application_files (event_id, field_id, filename, mime, size, data)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [eventId, fieldId, name, MIME[ext], buf.length, buf]
    );
    return NextResponse.json({ id: rows[0].id, name, size: buf.length });
  } catch (err: any) {
    console.error("[POST /api/applications/upload]", err);
    return fail("Upload failed. Please try again.", 500);
  }
}
