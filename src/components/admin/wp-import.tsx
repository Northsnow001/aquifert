"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, Download, FileJson, Loader2, RefreshCw, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { discardWpImport, downloadWpFile, finishWpDownloads, previewWpImport, runWpImport } from "@/app/admin/import/actions";
import { Panel, Switch } from "@/components/admin/aquibot/shared";
import { btnGhost, btnPrimary, btnSecondary, field, label } from "@/components/admin/ui";
import { formatBytes, type TelexAccess } from "@/lib/content-types";
import type { ExportSummary, ImportOptions, PendingFile, SectionKey, SectionPlan } from "@/lib/wp-import/import";

type Ready = { summary: ExportSummary; options: ImportOptions; sections: SectionPlan[]; pending: PendingFile[] };

const ACCESS_OPTIONS: { value: TelexAccess; label: string }[] = [
  { value: "public", label: "All members" },
  { value: "growth", label: "Growth and AQ Zero" },
  { value: "enterprise", label: "AQ Zero only" },
];

const ORDER: SectionKey[] = ["telex", "indicators", "hedge", "freight", "tools", "library", "enquiries"];

function stamp(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-light font-mono text-[11px] font-bold text-blue">{n}</span>
      <div className="min-w-0 text-[13px] leading-relaxed text-mid">
        <p className="font-semibold text-ink">{title}</p>
        {children}
      </div>
    </li>
  );
}

function Count({ value, tone, children }: { value: number; tone: string; children: string }) {
  if (!value) return null;
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${tone}`}>
      {value.toLocaleString()} {children}
    </span>
  );
}

export function WpImport({ ready, lastRunAt }: { ready: Ready | null; lastRunAt: string | null }) {
  const router = useRouter();
  const [options, setOptions] = useState<ImportOptions | null>(ready?.options ?? null);
  const [sections, setSections] = useState<SectionPlan[]>(ready?.sections ?? []);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [imported, setImported] = useState<SectionPlan[] | null>(null);
  const [pending, setPending] = useState<PendingFile[]>(ready?.pending ?? []);
  const [progress, setProgress] = useState<{ done: number; total: number; current: string } | null>(null);
  const [failed, setFailed] = useState<{ file: PendingFile; message: string }[]>([]);
  const stopRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const previewRun = useRef(0);

  useEffect(() => () => clearTimeout(previewTimer.current), []);

  function changeOptions(next: ImportOptions) {
    setOptions(next);
    setPreviewing(true);
    clearTimeout(previewTimer.current);
    const run = ++previewRun.current;
    previewTimer.current = setTimeout(async () => {
      const result = await previewWpImport(next);
      if (run !== previewRun.current) return;
      setPreviewing(false);
      if (result.ok) setSections(result.sections);
      else toast.error(result.message);
    }, 250);
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch("/admin/import/upload", { method: "POST", body: form });
      const result = (await response.json()) as { ok: boolean; message?: string; telex?: number; files?: number };
      if (!result.ok) {
        toast.error(result.message ?? "The file could not be read.");
        return;
      }
      toast.success(`Export read: ${result.telex?.toLocaleString()} Telex and ${result.files?.toLocaleString()} library files`);
      router.refresh();
    } catch {
      toast.error("The upload failed. Check the connection and try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function downloadAll(queue: PendingFile[]) {
    if (queue.length === 0) return;
    stopRef.current = false;
    setFailed([]);
    const failures: { file: PendingFile; message: string }[] = [];
    let done = 0;
    for (const file of queue) {
      if (stopRef.current) break;
      setProgress({ done, total: queue.length, current: file.title });
      const result = await downloadWpFile(file.id).catch((error: unknown) => ({ ok: false as const, message: error instanceof Error ? error.message : "Download failed." }));
      if (result.ok) setPending((current) => current.filter((item) => item.id !== file.id));
      else failures.push({ file, message: result.message });
      done += 1;
    }
    const stopped = stopRef.current;
    setProgress(null);
    setFailed(failures);
    await finishWpDownloads();
    router.refresh();
    if (stopped) toast.message("Downloads stopped. Pick up where you left off at any time.");
    else if (failures.length) toast.error(`${failures.length} of ${queue.length} files could not be downloaded.`);
    else toast.success(`Downloaded ${queue.length} ${queue.length === 1 ? "file" : "files"}`);
  }

  async function runImport() {
    if (!options) return;
    const removing = sections.reduce((total, item) => total + item.removed, 0);
    if (removing && !window.confirm(`This removes ${removing.toLocaleString()} existing ${removing === 1 ? "item" : "items"} that are not in the WordPress export. Continue?`)) return;
    setImporting(true);
    const result = await runWpImport(options);
    setImporting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setImported(result.sections);
    setSections(result.sections.map((item) => ({ ...item, unchanged: item.unchanged + item.added + item.updated, added: 0, updated: 0, removed: 0 })));
    setPending(result.pending);
    toast.success("Import finished");
    router.refresh();
    if (result.pending.length && !ready?.summary.downloadExpired) void downloadAll(result.pending);
  }

  async function discard() {
    if (!window.confirm("Discard the uploaded export? Content already imported stays.")) return;
    await discardWpImport();
    router.refresh();
  }

  const setSection = (key: SectionKey, value: boolean) => {
    if (options) changeOptions({ ...options, sections: { ...options.sections, [key]: value } });
  };
  const summary = ready?.summary;
  const pendingBytes = pending.reduce((total, file) => total + file.bytes, 0);
  const plans = new Map(sections.map((item) => [item.key, item]));
  const anySection = options ? ORDER.some((key) => options.sections[key]) : false;

  return (
    <div className="space-y-5">
      <Panel
        title={summary ? "Export uploaded" : "Export from WordPress"}
        description={summary ? `From ${summary.site || "WordPress"}, exported ${stamp(summary.exportedAt)}.` : "A small plugin adds an export button to WordPress. It only reads content and changes nothing there."}
        icon={<FileJson className="h-4 w-4" />}
        actions={
          summary ? (
            <>
              <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className={btnSecondary}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload a newer export
              </button>
              <button type="button" onClick={discard} className={btnGhost}>
                <Trash2 className="h-3.5 w-3.5" />
                Discard
              </button>
            </>
          ) : null
        }
      >
        <input ref={inputRef} type="file" accept=".json,application/json" className="hidden" onChange={(event) => upload(event.target.files?.[0])} />
        {summary ? (
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-[12.5px] text-mid">
            <span>
              Library: <strong className="text-ink">{summary.fileCount.toLocaleString()}</strong> files, {formatBytes(summary.fileBytes)}
            </span>
            <span>
              File access until:{" "}
              <strong className={summary.downloadExpired ? "text-danger" : "text-ink"}>{summary.downloadExpired ? "expired" : stamp(summary.downloadExpiresAt)}</strong>
            </span>
            {lastRunAt ? (
              <span>
                Last imported: <strong className="text-ink">{stamp(lastRunAt)}</strong>
              </span>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <ol className="space-y-4">
              <Step n={1} title="Download the plugin">
                <a href="/admin/import/plugin" className={`${btnSecondary} mt-2`}>
                  <Download className="h-4 w-4" />
                  aquifert-export.zip
                </a>
              </Step>
              <Step n={2} title="Install it in WordPress">
                <p>Plugins → Add New → Upload Plugin, choose the zip, then Install Now and Activate.</p>
              </Step>
              <Step n={3} title="Download the export">
                <p>Tools → Aquifert export → Download export file. Keep the file private: for 3 days it can fetch the library files.</p>
              </Step>
            </ol>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                void upload(event.dataTransfer.files?.[0]);
              }}
              disabled={uploading}
              className={`flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 text-center transition ${
                dragging ? "border-blue bg-blue-light/60" : "border-border bg-s2/40 hover:border-blue/50 hover:bg-blue-light/30"
              }`}
            >
              {uploading ? <Loader2 className="h-6 w-6 animate-spin text-blue" /> : <Upload className="h-6 w-6 text-blue" />}
              <span className="text-[13.5px] font-semibold text-ink">{uploading ? "Reading the export…" : "Drop the export file here"}</span>
              <span className="text-[12px] text-dim">or click to choose aquifert-export-….json</span>
            </button>
          </div>
        )}
      </Panel>

      {summary && options ? (
        <Panel
          title="Choose what to import"
          description="The preview compares the export with what this app has now. Nothing changes until you click Import."
          icon={<RefreshCw className="h-4 w-4" />}
          actions={previewing ? <span className="flex items-center gap-1.5 text-[12px] text-dim"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating preview</span> : null}
        >
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {ORDER.map((key) => {
              const plan = plans.get(key);
              const enabled = options.sections[key];
              return (
                <li key={key} className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start ${enabled ? "" : "bg-s2/40"}`}>
                  <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                    <input type="checkbox" checked={enabled} onChange={(event) => setSection(key, event.target.checked)} className="mt-0.5 h-4 w-4 accent-blue" />
                    <span className="min-w-0">
                      <span className={`block text-[13.5px] font-semibold ${enabled ? "text-ink" : "text-mid"}`}>{plan?.label ?? key}</span>
                      {enabled && plan?.notes.length ? (
                        <span className="mt-1 block space-y-0.5">
                          {plan.notes.map((note) => (
                            <span key={note} className="block text-[12px] leading-relaxed text-dim">
                              {note}
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </span>
                  </label>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5 pl-7 sm:pl-0">
                    {enabled && plan ? (
                      <>
                        <span className="mr-1 font-mono text-[11.5px] text-dim">{plan.available.toLocaleString()} in export</span>
                        <Count value={plan.added} tone="bg-[#eaf7ef] text-[#1f5c38]">
                          new
                        </Count>
                        <Count value={plan.updated} tone="bg-blue-light text-blue">
                          updated
                        </Count>
                        <Count value={plan.unchanged} tone="bg-s2 text-mid">
                          unchanged
                        </Count>
                        <Count value={plan.removed} tone="bg-[#fdecec] text-[#9b2c2c]">
                          removed
                        </Count>
                      </>
                    ) : (
                      <span className="font-mono text-[11.5px] text-dim">Skipped</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="space-y-4">
              <Switch
                checked={options.replaceExisting}
                onChange={(value) => changeOptions({ ...options, replaceExisting: value })}
                label="Replace what is here now"
                description="Removes Telex, hedge tables, collections and files that are not in this export, such as the sample content. Enquiries are always kept."
              />
              <div>
                <label htmlFor="telexAccess" className={label}>
                  Telex visible to
                </label>
                <select
                  id="telexAccess"
                  value={options.telexAccess}
                  onChange={(event) => changeOptions({ ...options, telexAccess: event.target.value as TelexAccess })}
                  className={`${field} mt-1.5 h-10 w-full`}
                >
                  {ACCESS_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11.5px] text-dim">WordPress Telex has no plan levels, so one level applies to every message. Change single messages later in Telex.</p>
              </div>
            </div>

            {summary.products.length ? (
              <div>
                <p className={label}>Files sold through MemberPress</p>
                <p className="mt-1 text-[11.5px] text-dim">WordPress sold some files one by one. Here files open by plan, so choose the plan each product stands for.</p>
                <div className="mt-2 divide-y divide-border rounded-xl border border-border">
                  {summary.products.map((product) => (
                    <div key={product.id} className="flex items-center gap-3 px-3 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">{product.title}</span>
                        <span className="block text-[11.5px] text-dim">
                          {product.files ? `${product.files} ${product.files === 1 ? "file" : "files"}` : "No files"}
                        </span>
                      </span>
                      <select
                        aria-label={`Plan for ${product.title}`}
                        value={options.productAccess[product.id] ?? "growth"}
                        onChange={(event) => changeOptions({ ...options, productAccess: { ...options.productAccess, [product.id]: event.target.value as TelexAccess } })}
                        className={`${field} h-9 w-48`}
                      >
                        {ACCESS_OPTIONS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
            {!anySection ? <span className="text-[12px] text-dim">Choose at least one section.</span> : null}
            <button type="button" onClick={runImport} disabled={importing || previewing || !anySection || Boolean(progress)} className={btnPrimary}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {importing ? "Importing…" : lastRunAt || imported ? "Import again" : "Import"}
            </button>
          </div>
        </Panel>
      ) : null}

      {summary && (progress || pending.length > 0 || failed.length > 0) ? (
        <Panel
          title="Library files"
          description="Each file is copied from WordPress into this app, one at a time."
          icon={<Download className="h-4 w-4" />}
          actions={
            progress ? (
              <button
                type="button"
                onClick={() => {
                  stopRef.current = true;
                }}
                className={btnGhost}
              >
                <X className="h-3.5 w-3.5" />
                Stop after this file
              </button>
            ) : pending.length && !summary.downloadExpired ? (
              <button type="button" onClick={() => downloadAll(pending)} className={btnPrimary}>
                <Download className="h-4 w-4" />
                Download {pending.length.toLocaleString()} {pending.length === 1 ? "file" : "files"} ({formatBytes(pendingBytes)})
              </button>
            ) : null
          }
        >
          {progress ? (
            <div>
              <div className="flex items-center justify-between text-[12.5px] text-mid">
                <span className="flex min-w-0 items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-blue" />
                  <span className="truncate">{progress.current}</span>
                </span>
                <span className="shrink-0 font-mono">
                  {progress.done} / {progress.total}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-s2">
                <div className="h-full rounded-full bg-blue transition-all" style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }} />
              </div>
            </div>
          ) : summary.downloadExpired && pending.length ? (
            <p className="flex items-start gap-2 text-[13px] text-[#9a5b00]">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              File access for this export has expired. Download a new export in WordPress and upload it here to fetch the remaining {pending.length.toLocaleString()} files.
            </p>
          ) : pending.length ? (
            <p className="text-[13px] text-mid">
              {pending.length.toLocaleString()} {pending.length === 1 ? "file is" : "files are"} listed but not copied yet. They show in the hub without a download until then.
            </p>
          ) : null}
          {failed.length ? (
            <ul className="mt-3 space-y-1.5">
              {failed.map(({ file, message }) => (
                <li key={file.id} className="flex items-start gap-2 rounded-lg bg-[#fdf2f1] px-3 py-2 text-[12.5px] text-[#9b2c2c]">
                  <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    <strong>{file.title}</strong>: {message}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </Panel>
      ) : null}

      {imported && !progress ? (
        <section className="rounded-2xl border border-[#cdebd8] bg-[#f1faf4] px-5 py-4">
          <p className="flex items-center gap-2 text-[14px] font-bold text-[#1f5c38]">
            <CheckCircle2 className="h-4 w-4" />
            Imported
          </p>
          <ul className="mt-2 space-y-1 text-[13px] text-[#1f5c38]">
            {imported.map((item) => (
              <li key={item.key}>
                {item.label}: {item.added.toLocaleString()} new, {item.updated.toLocaleString()} updated
                {item.removed ? `, ${item.removed.toLocaleString()} removed` : ""}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/admin/aquibot?tab=knowledge" className={btnPrimary}>
              Index for Aquibot
            </Link>
            <Link href="/hub" className={btnSecondary}>
              Open the hub
            </Link>
          </div>
          <p className="mt-3 text-[12px] text-[#1f5c38]/80">
            Once everything is across, deactivate and delete the Aquifert Export plugin in WordPress. That also shuts the file link.
          </p>
        </section>
      ) : null}
    </div>
  );
}
