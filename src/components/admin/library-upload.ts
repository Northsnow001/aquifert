"use client";

import type { IndexResult } from "@/lib/aquibot-engine/indexer";

export type UploadResult = { ok: boolean; id?: string; message?: string };
type Prepared = { ok: true; id: string; storedName: string; upload: { url: string } | null } | { ok: false; message: string };

export const LIBRARY_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.zip";
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

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

export async function sendLibraryForm(body: FormData, onProgress: (value: number) => void): Promise<UploadResult> {
  const response = await request("POST", "/admin/library/upload", body, onProgress);
  if (!response) return { ok: false, message: NETWORK_ERROR };
  try {
    return JSON.parse(response.text) as UploadResult;
  } catch {
    return { ok: false, message: `Upload failed (${response.status}).` };
  }
}

/** Sends the file straight to storage when the server hands out a signed link, then saves the details. */
export async function sendLibraryFile(base: FormData, file: File, onProgress: (value: number) => void): Promise<UploadResult> {
  const ask = new FormData();
  ask.set("intent", "prepare");
  ask.set("name", file.name);
  ask.set("size", String(file.size));
  const id = base.get("id");
  if (id) ask.set("id", String(id));
  const prepared = (await sendLibraryForm(ask, () => undefined)) as Prepared;
  if (!prepared.ok) return prepared;
  if (!prepared.upload) {
    base.set("file", file);
    return sendLibraryForm(base, onProgress);
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
  return sendLibraryForm(base, () => undefined);
}

/** Indexes one knowledge source through the admin route; several can run at once, unlike server actions. */
export async function indexSourceNow(key: string, force = false): Promise<IndexResult> {
  try {
    const response = await fetch("/admin/aquibot/index", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, force }) });
    const result = (await response.json().catch(() => null)) as IndexResult | null;
    return result ?? { key, ok: false, state: "error", chunkCount: 0, message: `Indexing failed (${response.status}).` };
  } catch {
    return { key, ok: false, state: "error", chunkCount: 0, message: NETWORK_ERROR };
  }
}

/** Runs `task` over `items`, at most `limit` at a time. */
export async function eachLimited<T>(items: T[], limit: number, task: (item: T, index: number) => Promise<void>, stop?: () => boolean) {
  let next = 0;
  const worker = async () => {
    while (next < items.length && !stop?.()) {
      const index = next++;
      await task(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
