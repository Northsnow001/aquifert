/**
 * Admin Library, manual upload, management, versioning and the editorial
 * review screen for AI-drafted weekly reports.
 * AI drafts land in `in_review`; a human publishes (AI_AUTOPUBLISH=false).
 */
import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft, CheckCircle2, FileUp, History, Loader2, Lock, Plus, RefreshCw, Sparkles, TriangleAlert, Upload,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";

const STATUS_TONE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  in_review: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  approved: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  published: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  archived: "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
};
const TYPE_LABEL: Record<string, string> = {
  weekly_market: "Weekly market", special_report: "Special report", data_pack: "Data pack", training: "Training", other: "Other",
};

const inputCls =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white";
const labelCls = "mb-1 block text-[12px] font-semibold text-navy-900 dark:text-white";

const fmtDay = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "N/A";

/* ---------------------------------------------------------------- */
/* Create form                                                        */
/* ---------------------------------------------------------------- */
function CreateForm({ onDone }: { onDone: (id: string) => void }) {
  const [f, setF] = useState({
    title: "", reportType: "weekly_market", weekNumber: "", year: String(new Date().getFullYear()),
    periodStart: "", periodEnd: "", summary: "", accessLevel: "members", tags: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const create = trpc.libraryAdmin.create.useMutation();
  const attach = trpc.libraryAdmin.attachFile.useMutation();

  const submit = async (publish: boolean) => {
    if (!f.title.trim() || !f.summary.trim()) {
      toast.error("Title and summary are required");
      return;
    }
    setBusy(true);
    try {
      const { id } = await create.mutateAsync({
        title: f.title.trim(),
        reportType: f.reportType as never,
        weekNumber: f.weekNumber ? Number(f.weekNumber) : undefined,
        year: f.year ? Number(f.year) : undefined,
        periodStart: f.periodStart || undefined,
        periodEnd: f.periodEnd || undefined,
        summary: f.summary.trim(),
        accessLevel: f.accessLevel as never,
        tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/library/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Upload failed");
        await attach.mutateAsync({ id, ...json });
      }
      toast.success(publish ? "Report created, publish it from the editor" : "Draft saved");
      onDone(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the report");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-[16px] font-bold text-navy-900 dark:text-white">New report</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="nr-title" className={labelCls}>Title *</label>
          <input id="nr-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label htmlFor="nr-type" className={labelCls}>Report type *</label>
          <select id="nr-type" value={f.reportType} onChange={(e) => setF({ ...f, reportType: e.target.value })} className={inputCls}>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="nr-access" className={labelCls}>Access level *</label>
          <select id="nr-access" value={f.accessLevel} onChange={(e) => setF({ ...f, accessLevel: e.target.value })} className={inputCls}>
            <option value="free">Free</option>
            <option value="members">Members</option>
            <option value="premium">Premium</option>
          </select>
        </div>
        <div>
          <label htmlFor="nr-week" className={labelCls}>Week number</label>
          <input id="nr-week" value={f.weekNumber} inputMode="numeric" onChange={(e) => setF({ ...f, weekNumber: e.target.value.replace(/\D/g, "") })} className={inputCls} />
        </div>
        <div>
          <label htmlFor="nr-year" className={labelCls}>Year</label>
          <input id="nr-year" value={f.year} inputMode="numeric" onChange={(e) => setF({ ...f, year: e.target.value.replace(/\D/g, "") })} className={inputCls} />
        </div>
        <div>
          <label htmlFor="nr-ps" className={labelCls}>Period start</label>
          <input id="nr-ps" type="date" value={f.periodStart} onChange={(e) => setF({ ...f, periodStart: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label htmlFor="nr-pe" className={labelCls}>Period end</label>
          <input id="nr-pe" type="date" value={f.periodEnd} onChange={(e) => setF({ ...f, periodEnd: e.target.value })} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="nr-summary" className={labelCls}>Summary * <span className="font-normal text-slate-500">(2 to 3 sentences, this is what locked users see)</span></label>
          <textarea id="nr-summary" rows={3} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="nr-tags" className={labelCls}>Tags <span className="font-normal text-slate-500">(comma separated products and regions)</span></label>
          <input id="nr-tags" value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} placeholder="Urea, Brazil, Freight" className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="nr-file" className={labelCls}>File <span className="font-normal text-slate-500">(PDF, DOCX, XLSX or PPTX, max 25MB, checked by content signature)</span></label>
          <input id="nr-file" type="file" accept=".pdf,.docx,.xlsx,.pptx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-600 file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:text-sm file:font-semibold file:text-navy-700 hover:file:bg-slate-200 dark:text-slate-300" />
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={() => submit(false)} disabled={busy} className="inline-flex h-10 items-center rounded-lg bg-navy-700 px-5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <FileUp className="mr-2 h-4 w-4" aria-hidden="true" />}
          Save as draft
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Detail editor + review screen                                      */
/* ---------------------------------------------------------------- */
function Detail({ id, onBack }: { id: string; onBack: () => void }) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.libraryAdmin.get.useQuery({ id });
  const update = trpc.libraryAdmin.update.useMutation({ onSuccess: () => utils.libraryAdmin.get.invalidate({ id }) });
  const publish = trpc.libraryAdmin.publish.useMutation({ onSuccess: () => utils.libraryAdmin.get.invalidate({ id }), onError: (e) => toast.error(e.message) });
  const archive = trpc.libraryAdmin.archive.useMutation({ onSuccess: () => utils.libraryAdmin.get.invalidate({ id }) });
  const rollback = trpc.libraryAdmin.rollback.useMutation({ onSuccess: () => { utils.libraryAdmin.get.invalidate({ id }); toast.success("Rolled back, content returned to draft"); } });
  const updateSection = trpc.libraryAdmin.updateSection.useMutation({ onSuccess: () => utils.libraryAdmin.get.invalidate({ id }) });
  const regenSection = trpc.libraryAdmin.regenerateSection.useMutation({ onSuccess: () => utils.libraryAdmin.get.invalidate({ id }), onError: (e) => toast.error(e.message) });
  const resolveFlag = trpc.libraryAdmin.resolveFlag.useMutation({ onSuccess: () => utils.libraryAdmin.get.invalidate({ id }) });
  const [accessLevel, setAccessLevel] = useState<string | null>(null);
  const [scheduleAt, setScheduleAt] = useState("");

  const r = data?.report;
  const flags = useMemo(() => (r?.validationFlags ?? []) as { check: string; sectionKey: string | null; message: string; blocking: boolean; resolved: boolean }[], [r]);
  const openFlags = flags.filter((f) => !f.resolved);
  const blocking = openFlags.filter((f) => f.blocking);

  if (isLoading || !r) return <div className="p-10 text-center text-slate-500">Loading report…</div>;

  const body = (r.body ?? []) as { key: string; heading: string; paragraphs: string[]; citations: { sourceRefId: string; marker: number }[] }[];
  const sources = data?.sources ?? [];

  return (
    <div className="space-y-6">
      <button type="button" onClick={onBack} className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">
        <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" /> All reports
      </button>

      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_TONE[r.status]}`}>{r.status.replace("_", " ")}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{TYPE_LABEL[r.reportType]}</span>
          {r.origin === "ai_generated" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Sparkles className="h-3 w-3" aria-hidden="true" />AI-drafted · desk-reviewed
            </span>
          )}
          {r.fileName && <span className="text-[12px] text-slate-500">{r.fileName} ({Math.round((r.fileSizeBytes ?? 0) / 1024)} KB)</span>}
        </div>
        <h1 className="mt-3 text-xl font-bold text-navy-900 dark:text-white">{r.title}</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          {r.weekNumber ? `Week ${r.weekNumber}, ${r.year} · ` : ""}
          {fmtDay(r.periodStart)} to {fmtDay(r.periodEnd)} · {r.authorName} · {r.viewCount} views · {r.downloadCount} downloads
        </p>
        {r.origin === "ai_generated" && (
          <p className="mt-1 text-[12px] text-slate-400">
            Model: {r.aiModel} · prompt {r.aiPromptVersion}
            {r.aiReviewedAt ? ` · reviewed ${fmtDay(r.aiReviewedAt)}` : " · not yet reviewed"}
          </p>
        )}
        <p className="mt-3 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-300">{r.summary}</p>
      </div>

      {/* validation flags */}
      {flags.length > 0 && (
        <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-5 dark:border-amber-500/40 dark:bg-amber-950/30" role="alert">
          <h2 className="flex items-center gap-2 text-[14px] font-bold text-amber-800 dark:text-amber-200">
            <TriangleAlert className="h-4 w-4" aria-hidden="true" />
            Validation, {openFlags.length} open flag{openFlags.length === 1 ? "" : "s"}
            {blocking.length > 0 && ` (${blocking.length} blocking publish)`}
          </h2>
          <ul className="mt-3 space-y-2">
            {flags.map((f, i) => (
              <li key={i} className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-[13px] ${f.resolved ? "border-slate-200 bg-white text-slate-400 line-through dark:border-slate-700 dark:bg-slate-900" : "border-amber-200 bg-white text-slate-700 dark:border-amber-500/30 dark:bg-slate-900 dark:text-slate-200"}`}>
                <span>
                  <strong className="uppercase">{f.check}</strong>
                  {f.sectionKey ? ` · ${f.sectionKey}` : ""}: {f.message}
                  {f.blocking && !f.resolved && <span className="ml-1 rounded bg-red-100 px-1.5 text-[10px] font-bold text-red-700">BLOCKING</span>}
                </span>
                {!f.resolved && (
                  <button type="button" onClick={() => resolveFlag.mutate({ id, index: i })} className="shrink-0 rounded-lg border border-slate-300 px-2.5 py-1 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">
                    Resolve
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* sections, editable in place during review */}
      {body.map((sec) => (
        <section key={sec.key} className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900" aria-label={sec.heading}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-bold text-navy-900 dark:text-white">{sec.heading}</h2>
            {r.origin === "ai_generated" && (
              <button
                type="button"
                onClick={() => regenSection.mutate({ id, sectionKey: sec.key })}
                disabled={regenSection.isPending}
                className="inline-flex h-9 items-center rounded-lg border border-slate-300 px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300"
              >
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${regenSection.isPending ? "animate-spin" : ""}`} aria-hidden="true" />
                Regenerate this section
              </button>
            )}
          </div>
          <textarea
            key={`${sec.key}-${String(r.updatedAt)}`}
            aria-label={`${sec.heading} content`}
            rows={Math.max(4, sec.paragraphs.length * 3)}
            defaultValue={sec.paragraphs.join("\n\n")}
            onBlur={(e) => {
              const paras = e.target.value.split(/\n\n+/).map((x) => x.trim()).filter(Boolean);
              if (paras.join("\n\n") !== sec.paragraphs.join("\n\n")) {
                updateSection.mutate({ id, sectionKey: sec.key, paragraphs: paras });
                toast.success(`${sec.heading} saved`);
              }
            }}
            className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13.5px] leading-relaxed text-navy-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          {sec.citations.length > 0 && (
            <p className="mt-2 text-[12px] text-slate-500">
              Citations: {sec.citations.map((c) => {
                const src = sources.find((x) => x.sourceId === c.sourceRefId.split(":")[1]);
                return `[${c.marker}] ${src?.sourceTitle ?? c.sourceRefId}`;
              }).join(" · ")}
            </p>
          )}
        </section>
      ))}

      {/* corpus side list */}
      {sources.length > 0 && (
        <details className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <summary className="cursor-pointer text-[14px] font-bold text-navy-900 dark:text-white">Corpus items used ({sources.length})</summary>
          <ul className="mt-3 space-y-1.5 text-[12.5px] text-slate-600 dark:text-slate-300">
            {sources.map((src) => (
              <li key={src.id}>
                <span className="rounded bg-slate-100 px-1.5 text-[10.5px] font-semibold uppercase text-slate-500 dark:bg-slate-800">{src.sourceType.replace(/_/g, " ")}</span>{" "}
                {src.sourceUrl ? <a href={src.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-navy-700 underline-offset-2 hover:underline dark:text-navy-200">{src.sourceTitle}</a> : src.sourceTitle}
                {" "}· {fmtDay(src.sourceDate)}
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* versions */}
      {(data?.versions?.length ?? 0) > 0 && (
        <details className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <summary className="flex cursor-pointer items-center gap-2 text-[14px] font-bold text-navy-900 dark:text-white">
            <History className="h-4 w-4" aria-hidden="true" /> Version history ({data!.versions.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {data!.versions.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 text-[13px] text-slate-600 dark:text-slate-300">
                <span>v{v.version} · {fmtDay(v.createdAt)} · {v.changeNote ?? "edit"}</span>
                <button type="button" onClick={() => rollback.mutate({ id, versionId: v.id })} className="rounded-lg border border-slate-300 px-2.5 py-1 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">
                  Roll back to this
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* publish bar */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <div>
          <label htmlFor="pub-access" className={labelCls}>Access level (required before publishing)</label>
          <select id="pub-access" value={accessLevel ?? r.accessLevel} onChange={(e) => { setAccessLevel(e.target.value); update.mutate({ id, accessLevel: e.target.value as never }); }} className={`${inputCls} w-44`}>
            <option value="free">Free</option>
            <option value="members">Members</option>
            <option value="premium">Premium</option>
          </select>
        </div>
        <div>
          <label htmlFor="pub-sched" className={labelCls}>Schedule for</label>
          <input id="pub-sched" type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className={`${inputCls} w-56`} />
        </div>
        <span className="flex-1" />
        <button type="button" onClick={() => archive.mutate({ id })} className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">
          {r.status === "published" ? "Archive" : "Discard"}
        </button>
        {scheduleAt ? (
          <button type="button" onClick={() => publish.mutate({ id, scheduledFor: new Date(scheduleAt).toISOString() })} disabled={publish.isPending} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            Schedule
          </button>
        ) : (
          <button type="button" onClick={() => publish.mutate({ id })} disabled={publish.isPending || blocking.length > 0} title={blocking.length > 0 ? "Resolve blocking validation flags first" : undefined} className="inline-flex h-10 items-center rounded-lg bg-teal-600 px-5 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-60">
            <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {r.origin === "ai_generated" ? "Approve and publish" : "Publish now"}
          </button>
        )}
        {blocking.length > 0 && (
          <p className="w-full text-[12px] text-amber-700 dark:text-amber-300">
            <Lock className="mr-1 inline h-3 w-3" aria-hidden="true" />
            Publishing is locked until {blocking.length} blocking validation flag{blocking.length === 1 ? " is" : "s are"} resolved.
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* List                                                               */
/* ---------------------------------------------------------------- */
export default function AdminLibrary() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();
  const [filters, setFilters] = useState({ status: "", reportType: "", accessLevel: "", origin: "" });
  const [creating, setCreating] = useState(false);
  const [genRange, setGenRange] = useState(() => {
    const end = new Date();
    const start = new Date(Date.now() - 7 * 864e5);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    return { start: iso(start), end: iso(end) };
  });
  const [selected, setSelected] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: flags } = trpc.library.flags.useQuery();
  const { data, isLoading } = trpc.libraryAdmin.list.useQuery({
    status: filters.status || undefined,
    reportType: filters.reportType || undefined,
    accessLevel: filters.accessLevel || undefined,
    origin: filters.origin || undefined,
  });
  const generate = trpc.libraryAdmin.generate.useMutation({
    onSuccess: (r) => {
      if (r.ok) toast.success("Draft generated and waiting in review");
      else toast.warning(r.reason ?? "Nothing generated");
      utils.libraryAdmin.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const bulk = trpc.libraryAdmin.bulk.useMutation({ onSuccess: () => { setSelected([]); utils.libraryAdmin.list.invalidate(); } });

  if (flags && !flags.libraryEnabled) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-slate-500">The Library feature is switched off.</div>;
  }
  if (id) return <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6"><Detail id={id} onBack={() => navigate("/admin/library")} /></div>;

  const items = data?.items ?? [];
  const generations = data?.generations ?? [];
  const latestGen = generations[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Library</h1>
          <p className="mt-1 text-[13.5px] text-slate-500">Manual uploads and AI-drafted weekly market reports. A human always publishes.</p>
        </div>
        <button type="button" onClick={() => setCreating((v) => !v)} className="inline-flex h-10 items-center rounded-lg bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-800">
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" /> New report
        </button>
      </div>

      {creating && <div className="mt-5"><CreateForm onDone={(newId) => { setCreating(false); utils.libraryAdmin.list.invalidate(); navigate(`/admin/library/${newId}`); }} /></div>}

      {/* AI generation */}
      {flags?.aiReportsEnabled && (
        <div className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <div>
            <h2 className="text-[14px] font-bold text-navy-900 dark:text-white">AI weekly report</h2>
            <p className="mt-0.5 text-[12.5px] text-slate-500">Drafts from TELEX, prices, publisher news feeds, open datasets, freight records and desk assessments only. Lands in review, never auto-publishes.</p>
          </div>
          <span className="flex-1" />
          <div>
            <label htmlFor="gen-start" className={labelCls}>From</label>
            <input id="gen-start" type="date" value={genRange.start} onChange={(e) => setGenRange({ ...genRange, start: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label htmlFor="gen-end" className={labelCls}>To</label>
            <input id="gen-end" type="date" value={genRange.end} onChange={(e) => setGenRange({ ...genRange, end: e.target.value })} className={inputCls} />
          </div>
          <button
            type="button"
            onClick={() => generate.mutate({ periodStart: genRange.start, periodEnd: genRange.end })}
            disabled={generate.isPending}
            className="inline-flex h-10 items-center rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-60"
          >
            {generate.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="mr-1.5 h-4 w-4" aria-hidden="true" />}
            {generate.isPending ? "Generating…" : "Generate draft"}
          </button>
          {generate.isPending && latestGen && (
            <p className="w-full text-[12px] text-slate-500">Running since {new Date(latestGen.startedAt).toLocaleTimeString("en-GB")}…</p>
          )}
          {latestGen?.status === "failed" && !generate.isPending && (
            <p className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700 dark:border-red-500/40 dark:bg-red-950/30">
              Last generation failed: {latestGen.error}
              <button type="button" onClick={() => generate.mutate({ periodStart: genRange.start, periodEnd: genRange.end })} className="ml-2 font-semibold underline">Retry</button>
            </p>
          )}
        </div>
      )}

      {/* filters */}
      <div className="mt-5 flex flex-wrap gap-2">
        {([
          ["status", ["", "draft", "in_review", "approved", "published", "archived"]],
          ["reportType", ["", ...Object.keys(TYPE_LABEL)]],
          ["accessLevel", ["", "free", "members", "premium"]],
          ["origin", ["", "manual_upload", "ai_generated"]],
        ] as const).map(([key, opts]) => (
          <select
            key={key}
            aria-label={`Filter by ${key.replace(/([A-Z])/g, " $1").toLowerCase()}`}
            value={filters[key]}
            onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
            className={`${inputCls} w-auto`}
          >
            {opts.map((o) => <option key={o} value={o}>{o === "" ? `Any ${key.replace(/([A-Z])/g, " $1").toLowerCase()}` : o.replace(/_/g, " ")}</option>)}
          </select>
        ))}
        {selected.length > 0 && (
          <>
            <span className="self-center text-[13px] text-slate-500">{selected.length} selected</span>
            <button type="button" onClick={() => bulk.mutate({ ids: selected, action: "publish" })} className="inline-flex h-10 items-center rounded-lg bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-500">Publish</button>
            <button type="button" onClick={() => bulk.mutate({ ids: selected, action: "archive" })} className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">Archive</button>
            {(["free", "members", "premium"] as const).map((lvl) => (
              <button key={lvl} type="button" onClick={() => bulk.mutate({ ids: selected, action: "publish", accessLevel: lvl })} className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">
                Set {lvl}
              </button>
            ))}
          </>
        )}
      </div>

      {/* table */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        {isLoading ? (
          <p className="p-10 text-center text-slate-500">Loading reports…</p>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-[14px] text-slate-600 dark:text-slate-300">No reports yet.</p>
            <button type="button" onClick={() => setCreating(true)} className="mt-3 inline-flex h-10 items-center rounded-lg bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-800">
              <Upload className="mr-1.5 h-4 w-4" aria-hidden="true" /> Create the first report
            </button>
          </div>
        ) : (
          <table className="w-full min-w-[900px] text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-700">
                <th className="px-3 py-2.5"><span className="sr-only">Select</span></th>
                <th className="px-3 py-2.5 font-medium">Title</th>
                <th className="px-3 py-2.5 font-medium">Type</th>
                <th className="px-3 py-2.5 font-medium">Week</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Access</th>
                <th className="px-3 py-2.5 font-medium">Origin</th>
                <th className="px-3 py-2.5 font-medium">Author</th>
                <th className="px-3 py-2.5 font-medium">Published</th>
                <th className="px-3 py-2.5 text-right font-medium">Views</th>
                <th className="px-3 py-2.5 text-right font-medium">Downloads</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50" onClick={() => { navigate(`/admin/library/${r.id}`); }}>
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.title}`}
                      checked={selected.includes(r.id)}
                      onChange={(e) => setSelected(e.target.checked ? [...selected, r.id] : selected.filter((x) => x !== r.id))}
                      className="h-4 w-4 accent-navy-700"
                    />
                  </td>
                  <td className="max-w-[260px] truncate px-3 py-2.5 font-semibold text-navy-900 dark:text-white">{r.title}</td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{TYPE_LABEL[r.reportType]}</td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{r.weekNumber ? `W${r.weekNumber} ${r.year ?? ""}` : "N/A"}</td>
                  <td className="px-3 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[r.status]}`}>{r.status.replace("_", " ")}</span></td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{r.accessLevel}</td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{r.origin === "ai_generated" ? "AI" : "Manual"}</td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{r.authorName}</td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{fmtDay(r.publishedAt)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{r.viewCount}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{r.downloadCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <input ref={fileRef} type="file" className="hidden" aria-hidden="true" />
    </div>
  );
}
