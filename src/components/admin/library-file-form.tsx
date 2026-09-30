"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleAlert, EyeOff, FileText, UploadCloud, X } from "lucide-react";
import { btnPrimary, input, label, textarea } from "@/components/admin/ui";
import { FILE_ACCESS_LABEL, formatBytes, type Collection, type LibraryDocument, type TelexAccess } from "@/lib/content-types";

type Upload = { file: File; progress: number; state: "waiting" | "sending" | "done" | "error"; message?: string };

const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.zip";
const ACCESS_HINT: Record<TelexAccess, string> = { public: "Every member", growth: "Growth and AQ Zero", enterprise: "AQ Zero only" };

type Result = { ok: boolean; id?: string; message?: string };
type Prepared = { ok: true; id: string; storedName: string; upload: { url: string } | null } | { ok: false; message: string };

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

const NETWORK_ERROR = "Network error. Check your connection and try again.";

async function send(body: FormData, onProgress: (value: number) => void): Promise<Result> {
  const response = await request("POST", "/admin/library/upload", body, onProgress);
  if (!response) return { ok: false, message: NETWORK_ERROR };
  try {
    return JSON.parse(response.text) as Result;
  } catch {
    return { ok: false, message: `Upload failed (${response.status}).` };
  }
}

/** Sends the file straight to storage when the server hands out a signed link, then saves the details. */
async function sendWithFile(base: FormData, file: File, onProgress: (value: number) => void): Promise<Result> {
  const ask = new FormData();
  ask.set("intent", "prepare");
  ask.set("name", file.name);
  ask.set("size", String(file.size));
  const id = base.get("id");
  if (id) ask.set("id", String(id));
  const prepared = (await send(ask, () => undefined)) as Prepared;
  if (!prepared.ok) return prepared;
  if (!prepared.upload) {
    base.set("file", file);
    return send(base, onProgress);
  }
  const payload = new FormData();
  payload.append("cacheControl", "3600");
  payload.append("", file);
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const stored = await request("PUT", prepared.upload.url, payload, (value) => onProgress(Math.min(value, 99)), { "x-upsert": "true", ...(anonKey ? { apikey: anonKey } : {}) });
  if (!stored) return { ok: false, message: NETWORK_ERROR };
  if (stored.status >= 300) {
    let detail = "";
    try {
      detail = (JSON.parse(stored.text) as { message?: string; error?: string }).message ?? "";
    } catch {
      /* not JSON */
    }
    return { ok: false, message: `Storage refused the file (${stored.status})${detail ? `: ${detail}` : "."}` };
  }
  base.delete("file");
  base.set("uploadId", prepared.id);
  base.set("storedName", prepared.storedName);
  base.set("originalName", file.name);
  return send(base, () => undefined);
}

export function LibraryFileForm({
  file,
  tree,
  defaultCollection,
  closeHref,
}: {
  file?: LibraryDocument;
  tree: { item: Collection; depth: number }[];
  defaultCollection?: string;
  closeHref: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [access, setAccess] = useState<TelexAccess>(file?.access ?? "public");
  const [hidden, setHidden] = useState(file?.private ?? false);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const batch = !file && uploads.length > 1;

  const choose = (list: FileList | null) => {
    if (!list?.length) return;
    const picked = Array.from(list).map((item) => ({ file: item, progress: 0, state: "waiting" as const }));
    setUploads(file ? picked.slice(0, 1) : (current) => [...current.filter((item) => item.state !== "done"), ...picked]);
    setError(null);
  };

  const patchUpload = (index: number, change: Partial<Upload>) => setUploads((current) => current.map((item, i) => (i === index ? { ...item, ...change } : item)));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file && uploads.length === 0) {
      setError("Choose or drop at least one file.");
      return;
    }
    setBusy(true);
    setError(null);
    const base = new FormData(formRef.current!);
    base.set("access", access);
    if (hidden) base.set("private", "on");
    else base.delete("private");

    if (file && uploads.length === 0) {
      const result = await send(base, () => undefined);
      setBusy(false);
      if (!result.ok) return setError(result.message ?? "Save failed.");
      router.push(`${closeHref}${closeHref.includes("?") ? "&" : "?"}saved=1`);
      router.refresh();
      return;
    }

    let failed = 0;
    for (let i = 0; i < uploads.length; i += 1) {
      if (uploads[i].state === "done") continue;
      const body = new FormData();
      base.forEach((value, key) => body.append(key, value));
      if (batch) {
        body.delete("title");
        body.delete("filename");
      }
      patchUpload(i, { state: "sending", progress: 0 });
      const result = await sendWithFile(body, uploads[i].file, (progress) => patchUpload(i, { progress }));
      if (result.ok) patchUpload(i, { state: "done", progress: 100 });
      else {
        failed += 1;
        patchUpload(i, { state: "error", message: result.message });
      }
    }
    setBusy(false);
    if (failed) {
      setError(`${failed} of ${uploads.length} ${uploads.length === 1 ? "file" : "files"} did not upload. Fix the issue and press upload again to retry.`);
      router.refresh();
      return;
    }
    router.push(`${closeHref}${closeHref.includes("?") ? "&" : "?"}saved=${file ? "1" : `uploaded&count=${uploads.length}`}`);
    router.refresh();
  };

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-4 p-5">
      {file ? <input type="hidden" name="id" value={file.id} /> : null}

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          choose(event.dataTransfer.files);
        }}
        onClick={() => pickerRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && pickerRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-5 text-center transition ${
          over ? "border-blue bg-blue-light/60" : "border-border hover:border-blue/50 hover:bg-s2/60"
        }`}
      >
        <UploadCloud className="h-6 w-6 text-blue" />
        <p className="text-[13px] font-semibold text-ink">
          {file ? (file.storedName ? "Drop a new version to replace the file" : "Drop the file here to attach it") : "Drop files here or click to choose"}
        </p>
        <p className="text-[11.5px] text-dim">PDF, Office, CSV, images or ZIP · up to 50 MB each{file ? "" : " · several at once"}</p>
        <input ref={pickerRef} type="file" accept={ACCEPT} multiple={!file} hidden onChange={(event) => choose(event.target.files)} />
      </div>

      {file && uploads.length === 0 ? (
        <p className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] ${file.storedName ? "bg-s2 text-mid" : "bg-[#fff6e5] text-[#9a5b00]"}`}>
          <FileText className="h-4 w-4 shrink-0" />
          {file.storedName ? (
            <span className="min-w-0 truncate">
              <span className="font-mono">{file.storedName}</span> · {file.size}
            </span>
          ) : (
            "No file attached yet, so members cannot download it."
          )}
        </p>
      ) : null}

      {uploads.length ? (
        <ul className="space-y-1.5">
          {uploads.map((item, i) => (
            <li key={`${item.file.name}-${i}`} className="rounded-lg border border-border px-3 py-2">
              <div className="flex items-center gap-2 text-[12.5px]">
                {item.state === "done" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1f7a45]" />
                ) : item.state === "error" ? (
                  <CircleAlert className="h-4 w-4 shrink-0 text-danger" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-blue" />
                )}
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{item.file.name}</span>
                <span className="shrink-0 font-mono text-[11px] text-dim">{formatBytes(item.file.size)}</span>
                {!busy && item.state !== "done" ? (
                  <button type="button" onClick={() => setUploads((current) => current.filter((_, n) => n !== i))} className="text-dim hover:text-danger" aria-label="Remove from upload">
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              {item.state === "sending" || item.state === "done" ? (
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-s2">
                  <div className={`h-full rounded-full transition-all ${item.state === "done" ? "bg-[#1f7a45]" : "bg-blue"}`} style={{ width: `${item.progress}%` }} />
                </div>
              ) : null}
              {item.message ? <p className="mt-1 text-[11.5px] text-danger">{item.message}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}

      {batch ? (
        <p className="rounded-lg bg-blue-light/60 px-3 py-2 text-[12px] text-blue">
          Uploading {uploads.length} files. Each takes its title from its file name. The settings below apply to all of them.
        </p>
      ) : (
        <>
          <div>
            <label className={label} htmlFor="title">
              Title
            </label>
            <input
              id="title"
              name="title"
              defaultValue={file?.title}
              placeholder={uploads[0] ? uploads[0].file.name.replace(/\.[^.]+$/, "").replace(/_+/g, " ") : "Taken from the file name when blank"}
              className={`${input} mt-1.5`}
            />
          </div>
          <div>
            <label className={label} htmlFor="summary">
              Summary
            </label>
            <textarea id="summary" name="summary" rows={3} defaultValue={file?.summary} placeholder="What members will find in this file" className={`${textarea} mt-1.5`} />
          </div>
        </>
      )}

      <fieldset>
        <legend className={label}>Access</legend>
        <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-lg bg-s2 p-1">
          {(Object.keys(FILE_ACCESS_LABEL) as TelexAccess[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setAccess(value)}
              aria-pressed={access === value}
              title={ACCESS_HINT[value]}
              className={`h-8 rounded-md text-[12.5px] font-semibold transition ${access === value ? "bg-white text-blue shadow-sm" : "text-mid hover:text-ink"}`}
            >
              {FILE_ACCESS_LABEL[value]}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[11.5px] text-dim">{ACCESS_HINT[access]} can download.</p>
      </fieldset>

      <fieldset>
        <legend className={label}>Collections</legend>
        <div className="mt-1.5 max-h-44 space-y-0.5 overflow-y-auto rounded-lg border border-border p-1.5">
          {tree.map(({ item, depth }) => (
            <label key={item.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-ink hover:bg-s2" style={{ paddingLeft: 8 + depth * 18 }}>
              <input
                type="checkbox"
                name="collectionIds"
                value={item.id}
                defaultChecked={file ? file.collectionIds.includes(item.id) : item.id === defaultCollection}
                className="h-4 w-4 accent-[#2e6da4]"
              />
              <span className="flex-1">{item.name}</span>
              {item.private ? <EyeOff className="h-3.5 w-3.5 text-[#9a5b00]" aria-label="Private collection" /> : null}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2.5">
        <input type="checkbox" checked={hidden} onChange={(event) => setHidden(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#9a5b00]" />
        <span>
          <span className="block text-[13px] font-semibold text-ink">Private</span>
          <span className="block text-[12px] text-mid">Keep the file here but hide it from the member library.</span>
        </span>
      </label>

      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-[12.5px] text-danger">{error}</p> : null}

      <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
        {busy ? "Uploading…" : file ? (uploads.length ? "Replace file and save" : "Save changes") : uploads.length > 1 ? `Upload ${uploads.length} files` : "Upload to library"}
      </button>
    </form>
  );
}
