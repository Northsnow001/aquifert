"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleAlert, CircleDashed, FileText, Loader2, RotateCcw, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { indexSourceNow, LIBRARY_ACCEPT, MAX_UPLOAD_BYTES, sendLibraryFile } from "@/components/admin/library-upload";
import { btnGhost, btnPrimary, field, label } from "@/components/admin/ui";
import { FILE_ACCESS_LABEL, formatBytes, type Collection, type TelexAccess } from "@/lib/content-types";
import { Panel, Switch } from "./shared";

type Stage = "queued" | "held" | "uploading" | "uploaded" | "reading" | "ready" | "upload_failed" | "index_failed" | "unreadable";

type Item = {
  id: string;
  file: File;
  stage: Stage;
  progress: number;
  /** Why the file is held back before upload, or why it failed. */
  note?: string;
  key?: string;
  passages?: number;
};

const ACCEPTED = new Set(LIBRARY_ACCEPT.split(",").map((value) => value.slice(1)));
const LEGACY = new Set(["doc", "xls", "ppt", "zip"]);
const INDEX_CONCURRENCY = 2;

/** Runs at most `limit` tasks at once; the rest wait their turn. */
function limiter(limit: number) {
  let active = 0;
  const waiting: (() => void)[] = [];
  return async <T,>(task: () => Promise<T>): Promise<T> => {
    if (active >= limit) await new Promise<void>((resolve) => waiting.push(resolve));
    active += 1;
    try {
      return await task();
    } finally {
      active -= 1;
      waiting.shift()?.();
    }
  };
}
const ACCESS_HINT: Record<TelexAccess, string> = {
  public: "Used for every member's answers and reports.",
  growth: "Used only for AQ Analytics and AQ ZERO members.",
  enterprise: "Used only for AQ ZERO members.",
};

const ext = (name: string) => (name.includes(".") ? name.split(".").pop()!.toLowerCase() : "");
const baseName = (name: string) => name.replace(/\.[^.]+$/, "").trim().toLowerCase();

let counter = 0;

export function KnowledgeUpload({ tree, existing }: { tree: { item: Collection; depth: number }[]; existing: { name: string; title: string }[] }) {
  const router = useRouter();
  const pickerRef = useRef<HTMLInputElement>(null);
  const stopRef = useRef(false);
  const [items, setItems] = useState<Item[]>([]);
  const [access, setAccess] = useState<TelexAccess>("public");
  const [inLibrary, setInLibrary] = useState(false);
  const [collection, setCollection] = useState("");
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    if (!busy) return;
    const onLeave = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [busy]);

  const patch = (id: string, change: Partial<Item>) => setItems((current) => current.map((item) => (item.id === id ? { ...item, ...change } : item)));

  const choose = (list: FileList | null) => {
    if (!list?.length) return;
    const known = new Map(existing.map((entry) => [entry.name, entry.title]));
    const batch = new Set(items.map((item) => `${baseName(item.file.name)}.${ext(item.file.name)}`));
    const added = Array.from(list).map((file): Item => {
      const type = ext(file.name);
      const id = `up-${(counter += 1)}`;
      const nameKey = `${baseName(file.name)}.${type}`;
      if (!ACCEPTED.has(type)) return { id, file, stage: "unreadable", progress: 0, note: `.${type || "?"} files are not accepted. Upload PDF, Word, Excel, PowerPoint, CSV, text or images.` };
      if (file.size > MAX_UPLOAD_BYTES) return { id, file, stage: "unreadable", progress: 0, note: `Over the ${formatBytes(MAX_UPLOAD_BYTES)} limit. Split or compress it first.` };
      if (LEGACY.has(type)) {
        return { id, file, stage: "held", progress: 0, note: type === "zip" ? "ZIP archives can't be read. Upload the files inside instead." : `Old .${type} files can't be read. Save it as .${type}x or PDF first.` };
      }
      if (known.has(nameKey)) return { id, file, stage: "held", progress: 0, note: `Looks like a duplicate of “${known.get(nameKey)}”, already uploaded.` };
      if (batch.has(nameKey)) return { id, file, stage: "held", progress: 0, note: "The same file name is already in this batch." };
      batch.add(nameKey);
      return { id, file, stage: "queued", progress: 0 };
    });
    setItems((current) => [...current.filter((item) => item.stage !== "ready"), ...added]);
    setSummary(null);
  };

  async function index(item: Item, key: string, force: boolean) {
    patch(item.id, { stage: "reading", key, note: undefined });
    const result = await indexSourceNow(key, force);
    if (result.ok) patch(item.id, { stage: "ready", passages: result.chunkCount });
    else patch(item.id, { stage: result.state === "unsupported" ? "unreadable" : "index_failed", note: result.message });
    return result.ok;
  }

  async function upload(item: Item) {
    patch(item.id, { stage: "uploading", progress: 0, note: undefined });
    const body = new FormData();
    body.set("access", access);
    if (!inLibrary) body.set("private", "on");
    if (collection) body.set("collectionIds", collection);
    body.set("index", "browser");
    const uploaded = await sendLibraryFile(body, item.file, (progress) => patch(item.id, { progress }));
    if (!uploaded.ok || !uploaded.id) {
      patch(item.id, { stage: "upload_failed", note: uploaded.message ?? "Upload failed." });
      return null;
    }
    const key = `file:${uploaded.id}`;
    patch(item.id, { stage: "uploaded", progress: 100, key });
    return key;
  }

  /** Uploads go one at a time, since each one saves the shared library list; indexing runs alongside, two at a time. */
  async function run(list: Item[]) {
    if (list.length === 0) return;
    stopRef.current = false;
    setBusy(true);
    setSummary(null);
    let ready = 0;
    let failed = 0;
    const slot = limiter(INDEX_CONCURRENCY);
    const indexing: Promise<void>[] = [];
    const queueIndex = (item: Item, key: string, force: boolean) =>
      indexing.push(slot(() => index(item, key, force)).then((ok) => void (ok ? (ready += 1) : (failed += 1))));
    for (const item of list) {
      if (stopRef.current) break;
      if (item.stage === "index_failed" && item.key) {
        queueIndex(item, item.key, true);
        continue;
      }
      const key = await upload(item);
      if (key) queueIndex(item, key, false);
      else failed += 1;
    }
    await Promise.all(indexing);
    setBusy(false);
    const left = list.length - ready - failed;
    const text = [`${ready} ready`, failed ? `${failed} failed` : "", left ? `${left} not started` : ""].filter(Boolean).join(" · ");
    setSummary(text);
    if (failed) toast.error(`${failed} of ${list.length} did not finish. Retry them below.`);
    else if (ready) toast.success(`${ready} ${ready === 1 ? "document is" : "documents are"} in the knowledge base`);
    router.refresh();
  }

  const pending = items.filter((item) => item.stage === "queued");
  const failedItems = items.filter((item) => item.stage === "upload_failed" || item.stage === "index_failed");
  const hold = (item: Item, value: boolean) => patch(item.id, value ? { stage: "held" } : { stage: "queued", note: undefined });

  return (
    <Panel
      title="Add documents to the knowledge base"
      description="Aquibot and the Nitrogen Report both read from these. Each file is read and indexed as soon as it uploads, so it can be used within a minute or two."
      icon={<UploadCloud className="h-4 w-4" />}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-3">
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
            className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
              over ? "border-blue bg-blue-light/60" : "border-border hover:border-blue/50 hover:bg-s2/60"
            }`}
          >
            <UploadCloud className="h-6 w-6 text-blue" />
            <p className="text-[13px] font-semibold text-ink">Drop documents here or click to choose</p>
            <p className="text-[11.5px] text-dim">PDF, Word, Excel, PowerPoint, CSV, text or images · up to 50 MB each · many at once</p>
            <p className="text-[11.5px] text-dim">Scanned PDFs and images are read with Gemini, which takes a little longer.</p>
            <input
              ref={pickerRef}
              type="file"
              accept={LIBRARY_ACCEPT}
              multiple
              hidden
              onChange={(event) => {
                choose(event.target.files);
                event.target.value = "";
              }}
            />
          </div>

          {items.length ? (
            <ul className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
              {items.map((item) => (
                <Row key={item.id} item={item} busy={busy} onRemove={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} onHold={(value) => hold(item, value)} onRetry={() => run([item])} />
              ))}
            </ul>
          ) : null}

          {summary ? <p className="rounded-lg bg-s2 px-3 py-2 text-[12.5px] text-ink">Finished: {summary}.</p> : null}
        </div>

        <div className="space-y-4">
          <Switch
            checked={inLibrary}
            onChange={setInLibrary}
            label="Also list in the member Library"
            description={inLibrary ? "Members can browse and download these files, and Aquibot may name them as sources." : "Knowledge only: hidden from members. Aquibot and the Nitrogen Report use it without naming the file."}
          />

          <fieldset>
            <legend className={label}>Plans</legend>
            <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-lg bg-s2 p-1">
              {(Object.keys(FILE_ACCESS_LABEL) as TelexAccess[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAccess(value)}
                  aria-pressed={access === value}
                  className={`h-8 rounded-md text-[12.5px] font-semibold transition ${access === value ? "bg-white text-blue shadow-sm" : "text-mid hover:text-ink"}`}
                >
                  {FILE_ACCESS_LABEL[value]}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11.5px] text-dim">{ACCESS_HINT[access]}</p>
          </fieldset>

          <div>
            <label htmlFor="knowledge-collection" className={label}>
              Collection
            </label>
            <select id="knowledge-collection" value={collection} onChange={(event) => setCollection(event.target.value)} className={`${field} mt-1.5 h-9 w-full`}>
              <option value="">No collection</option>
              {tree.map(({ item, depth }) => (
                <option key={item.id} value={item.id}>
                  {`${"\u00a0\u00a0".repeat(depth)}${item.name}`}
                </option>
              ))}
            </select>
          </div>

          {busy ? (
            <button type="button" className={`${btnGhost} w-full justify-center`} onClick={() => (stopRef.current = true)}>
              Stop after the current files
            </button>
          ) : (
            <div className="space-y-2">
              <button type="button" className={`${btnPrimary} w-full`} disabled={pending.length === 0} onClick={() => run(pending)}>
                <UploadCloud className="h-4 w-4" />
                {pending.length ? `Upload and index ${pending.length} ${pending.length === 1 ? "file" : "files"}` : "Choose files first"}
              </button>
              {failedItems.length ? (
                <button type="button" className={`${btnGhost} w-full justify-center`} onClick={() => run(failedItems)}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Retry {failedItems.length} failed
                </button>
              ) : null}
            </div>
          )}
          <p className="text-[11.5px] leading-relaxed text-dim">Keep this page open until the files say Ready. Anything left unfinished is picked up by background indexing.</p>
        </div>
      </div>
    </Panel>
  );
}

const STAGE: Record<Stage, string> = {
  queued: "Waiting",
  held: "Skipped",
  uploading: "Uploading",
  uploaded: "Uploaded · waiting to index",
  reading: "Reading and indexing",
  ready: "Ready",
  upload_failed: "Upload failed",
  index_failed: "Indexing failed",
  unreadable: "Can't be used",
};

function Row({ item, busy, onRemove, onHold, onRetry }: { item: Item; busy: boolean; onRemove: () => void; onHold: (value: boolean) => void; onRetry: () => void }) {
  const failed = item.stage === "upload_failed" || item.stage === "index_failed";
  const working = item.stage === "uploading" || item.stage === "reading";
  const icon =
    item.stage === "ready" ? (
      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1f7a45]" />
    ) : failed || item.stage === "unreadable" ? (
      <CircleAlert className="h-4 w-4 shrink-0 text-danger" />
    ) : working ? (
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue" />
    ) : item.stage === "held" ? (
      <CircleDashed className="h-4 w-4 shrink-0 text-[#9a5b00]" />
    ) : (
      <FileText className="h-4 w-4 shrink-0 text-blue" />
    );
  const status = item.stage === "ready" ? `Ready · ${item.passages ?? 0} passages` : item.stage === "uploading" ? `Uploading ${item.progress}%` : STAGE[item.stage];

  return (
    <li className="rounded-lg border border-border px-3 py-2">
      <div className="flex items-center gap-2 text-[12.5px]">
        {icon}
        <span className="min-w-0 flex-1 truncate font-medium text-ink" title={item.file.name}>
          {item.file.name}
        </span>
        <span className="hidden shrink-0 font-mono text-[11px] text-dim sm:inline">{formatBytes(item.file.size)}</span>
        <span className={`shrink-0 text-[11.5px] font-semibold ${item.stage === "ready" ? "text-[#1f7a45]" : failed || item.stage === "unreadable" ? "text-danger" : item.stage === "held" ? "text-[#9a5b00]" : "text-mid"}`}>{status}</span>
        {failed && !busy ? (
          <button type="button" onClick={onRetry} className="text-[11.5px] font-semibold text-blue hover:underline">
            Retry
          </button>
        ) : null}
        {!busy && !working && item.stage !== "ready" ? (
          <button type="button" onClick={onRemove} className="text-dim hover:text-danger" aria-label={`Remove ${item.file.name}`}>
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      {item.stage === "uploading" || item.stage === "reading" ? (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-s2">
          <div className={`h-full rounded-full bg-blue transition-all ${item.stage === "reading" ? "w-full animate-pulse" : ""}`} style={item.stage === "uploading" ? { width: `${item.progress}%` } : undefined} />
        </div>
      ) : null}
      {item.note ? (
        <p className={`mt-1 text-[11.5px] ${item.stage === "held" ? "text-[#9a5b00]" : "text-danger"}`}>
          {item.note}
          {item.stage === "held" && !busy ? (
            <button type="button" onClick={() => onHold(false)} className="ml-2 font-semibold text-blue hover:underline">
              Upload anyway
            </button>
          ) : null}
        </p>
      ) : null}
    </li>
  );
}
