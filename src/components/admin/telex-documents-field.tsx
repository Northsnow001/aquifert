"use client";

import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { CircleAlert, Eye, FileText, Loader2, Paperclip, Trash2, UploadCloud } from "lucide-react";
import { btnSecondary, input, label } from "@/components/admin/ui";
import {
  TELEX_DOC_EXTENSIONS,
  TELEX_DOC_LIMIT,
  TELEX_DOC_MAX_BYTES,
  checkTelexDocFile,
  formatBytes,
  telexDocExt,
  telexDocHref,
  telexDocView,
  type TelexDocument,
} from "@/lib/content-types";

export type DocRow = {
  key: string;
  /** Set once the file is in storage. */
  doc: TelexDocument | null;
  fileName: string;
  size: number;
  progress: number;
  state: "ready" | "sending" | "error";
  message?: string;
  /** Already listed on the saved flash. */
  saved: boolean;
};

export const docRows = (documents: TelexDocument[] = []): DocRow[] =>
  documents.map((doc) => ({ key: doc.id, doc, fileName: doc.name, size: doc.size, progress: 100, state: "ready", saved: true }));

/** What the form sends: only documents that reached storage. */
export const docListValue = (rows: DocRow[]) => JSON.stringify(rows.flatMap((row) => (row.state === "ready" && row.doc ? [{ id: row.doc.id, name: row.doc.name, title: row.doc.title }] : [])));

const ACCEPT = TELEX_DOC_EXTENSIONS.map((ext) => `.${ext}`).join(",");
const NETWORK_ERROR = "Network error. Check your connection and try again.";

type Reply = { ok: true; document?: TelexDocument; id?: string; name?: string; upload?: { url: string } | null } | { ok: false; message: string };

function request(method: string, url: string, body: FormData, onProgress: (value: number) => void, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; text: string } | null>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => event.lengthComputable && onProgress(Math.round((event.loaded / event.total) * 100));
    xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText });
    xhr.onerror = () => resolve(null);
    xhr.send(body);
  });
}

async function ask(fields: Record<string, string | File>, onProgress: (value: number) => void = () => undefined): Promise<Reply> {
  const body = new FormData();
  for (const [name, value] of Object.entries(fields)) body.set(name, value);
  const response = await request("POST", "/admin/telex/upload", body, onProgress);
  if (!response) return { ok: false, message: NETWORK_ERROR };
  try {
    return JSON.parse(response.text) as Reply;
  } catch {
    return { ok: false, message: `Upload failed (${response.status}).` };
  }
}

/** Straight to storage through a signed link when the server hands one out, otherwise through the upload route. */
async function uploadDocument(file: File, onProgress: (value: number) => void): Promise<{ ok: true; document: TelexDocument } | { ok: false; message: string }> {
  const prepared = await ask({ intent: "prepare", name: file.name, size: String(file.size) });
  if (!prepared.ok) return prepared;
  if (!prepared.upload || !prepared.id || !prepared.name) {
    const stored = await ask({ intent: "store", file }, (value) => onProgress(Math.min(value, 99)));
    return stored.ok && stored.document ? { ok: true, document: stored.document } : { ok: false, message: stored.ok ? "Upload failed." : stored.message };
  }
  const payload = new FormData();
  payload.append("cacheControl", "3600");
  payload.append("", file);
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const sent = await request("PUT", prepared.upload.url, payload, (value) => onProgress(Math.min(value, 99)), { "x-upsert": "true", ...(anonKey ? { apikey: anonKey } : {}) });
  if (!sent) return { ok: false, message: NETWORK_ERROR };
  if (sent.status >= 300) return { ok: false, message: `Storage refused the file (${sent.status}).` };
  const confirmed = await ask({ intent: "confirm", id: prepared.id, name: prepared.name, originalName: file.name });
  return confirmed.ok && confirmed.document ? { ok: true, document: confirmed.document } : { ok: false, message: confirmed.ok ? "Upload failed." : confirmed.message };
}

export function TelexDocumentsField({ telexId, rows, setRows }: { telexId?: string; rows: DocRow[]; setRows: Dispatch<SetStateAction<DocRow[]>> }) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState("");
  const [initial] = useState(() => docListValue(rows));
  const value = docListValue(rows);
  const changed = value !== initial;

  const patch = (key: string, next: Partial<DocRow>) => setRows((current) => current.map((row) => (row.key === key ? { ...row, ...next } : row)));

  const addFiles = async (files: File[]) => {
    setNotice("");
    const room = TELEX_DOC_LIMIT - rows.filter((row) => row.state !== "error").length;
    if (files.length > room) setNotice(room > 0 ? `A flash holds ${TELEX_DOC_LIMIT} documents. Only the first ${room} were added.` : `A flash holds ${TELEX_DOC_LIMIT} documents. Remove one to add another.`);
    const queued = files.slice(0, Math.max(room, 0)).map((file) => {
      const checked = checkTelexDocFile(file.name, file.size);
      const row: DocRow = {
        key: `up-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        doc: null,
        fileName: file.name,
        size: file.size,
        progress: 0,
        state: "error" in checked ? "error" : "sending",
        message: "error" in checked ? checked.error : undefined,
        saved: false,
      };
      return { file, row };
    });
    if (!queued.length) return;
    setRows((current) => [...current, ...queued.map((entry) => entry.row)]);
    for (const { file, row } of queued) {
      if (row.state === "error") continue;
      const result = await uploadDocument(file, (progress) => patch(row.key, { progress }));
      patch(row.key, result.ok ? { doc: result.document, state: "ready", progress: 100 } : { state: "error", message: result.message });
    }
  };

  const remove = (row: DocRow) => {
    setRows((current) => current.filter((entry) => entry.key !== row.key));
    if (!row.saved && row.doc) void ask({ intent: "discard", id: row.doc.id });
  };

  const rename = (row: DocRow, title: string) => row.doc && patch(row.key, { doc: { ...row.doc, title } });

  const busy = rows.some((row) => row.state === "sending");

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(26,58,92,0.05)]">
      <input type="hidden" name="documents" value={value} />
      <div className="flex items-baseline justify-between gap-2">
        <p className={label}>Documents</p>
        {busy ? (
          <span className="text-[11.5px] font-semibold text-blue">Uploading…</span>
        ) : changed ? (
          <span className="text-[11.5px] font-semibold text-blue">Saves with the message</span>
        ) : null}
      </div>

      {rows.length ? (
        <ul className="mt-2 flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.key} className={`rounded-xl border bg-white p-2.5 ${row.state === "error" ? "border-danger/40" : "border-border"}`}>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-light text-blue">
                  {row.state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : row.state === "error" ? <CircleAlert className="h-4 w-4 text-danger" /> : <FileText className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  {row.doc && row.state === "ready" ? (
                    <input
                      aria-label={`Title shown to members for ${row.fileName}`}
                      value={row.doc.title}
                      maxLength={160}
                      onChange={(event) => rename(row, event.target.value)}
                      className={`${input} h-8 text-[13px] font-semibold`}
                    />
                  ) : (
                    <p className="truncate pt-1 text-[13px] font-semibold text-ink">{row.fileName}</p>
                  )}
                  <p className="mt-1 text-[11.5px] text-dim">
                    {row.state === "error"
                      ? <span className="font-medium text-danger">{row.message}</span>
                      : [telexDocExt(row.doc?.name ?? row.fileName).toUpperCase(), formatBytes(row.size), row.state === "sending" ? `${row.progress}%` : row.saved ? "" : "New"].filter(Boolean).join(" · ")}
                  </p>
                  {row.state === "sending" ? (
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-s2">
                      <div className="h-full rounded-full bg-blue transition-[width]" style={{ width: `${row.progress}%` }} />
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  {row.saved && row.doc && telexId ? (
                    <a
                      href={telexDocHref(telexId, row.doc, telexDocView(row.doc.name) !== "download")}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${row.doc.title}`}
                      className="rounded-md p-1.5 text-dim hover:bg-s2 hover:text-ink"
                    >
                      <Eye className="h-4 w-4" />
                    </a>
                  ) : null}
                  {row.state !== "sending" ? (
                    <button type="button" onClick={() => remove(row)} aria-label={`Remove ${row.doc?.title ?? row.fileName}`} className="rounded-md p-1.5 text-dim hover:bg-s2 hover:text-danger">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void addFiles(Array.from(event.dataTransfer.files));
        }}
        className={`mt-2 flex flex-col items-center gap-1.5 rounded-xl border border-dashed px-3 py-4 text-center ${dragging ? "border-blue bg-blue-light/40" : "border-border bg-s2/40"}`}
      >
        <UploadCloud className="h-5 w-5 text-dim" aria-hidden />
        <p className="text-[12.5px] text-mid">Drop files here, or</p>
        <label htmlFor="telex-documents" className={`${btnSecondary} cursor-pointer`}>
          <Paperclip className="h-4 w-4" />
          {rows.length ? "Attach another" : "Attach a document"}
        </label>
        <input
          ref={pickerRef}
          id="telex-documents"
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (pickerRef.current) pickerRef.current.value = "";
            void addFiles(files);
          }}
        />
      </div>
      {notice ? <p className="mt-2 text-[12px] font-medium text-danger">{notice}</p> : null}
      <p className="mt-2 text-[12px] leading-relaxed text-dim">
        PDF, Word, Excel, PowerPoint, CSV, text or images, up to {TELEX_DOC_MAX_BYTES / (1024 * 1024)} MB each and {TELEX_DOC_LIMIT} per flash. Members read PDFs and images inside the app; other files download. The flash&apos;s access
        level applies to its documents.
      </p>
    </section>
  );
}
