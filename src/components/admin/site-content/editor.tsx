"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, CircleAlert, ExternalLink, Eye, EyeOff, RefreshCw, RotateCcw, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { saveSiteContent } from "@/app/admin/site-content/actions";
import { SaveBar, useEditorGuards } from "@/components/admin/aquibot/shared";
import { btnGhost, btnSecondary } from "@/components/admin/ui";
import { LeafInput, ListInput, isWide } from "@/components/admin/site-content/fields";
import { validatePage, type ContentIssue } from "@/lib/site-content/normalize";
import { SITE_SCHEMA, type Field, type SiteContent, type SitePageKey } from "@/lib/site-content/schema";

type Row = Record<string, string>;
type Section = Record<string, string | Row[]>;
type PageValue = Record<string, Section>;

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function previewUrl(path: string | null) {
  return path === null || path === "/" ? "/?preview=1" : path;
}

export function SiteContentEditor<K extends SitePageKey>({
  pageKey,
  initial,
  defaults,
  savedAt: initialSavedAt,
  savedBy,
}: {
  pageKey: K;
  initial: SiteContent[K];
  defaults: SiteContent[K];
  savedAt: string | null;
  savedBy: string | null;
}) {
  const router = useRouter();
  const page = SITE_SCHEMA[pageKey];
  const sections = Object.entries(page.sections) as [string, { label: string; description?: string; fields: Record<string, Field> }][];
  const [value, setValue] = useState<PageValue>(initial as unknown as PageValue);
  const [saved, setSaved] = useState<PageValue>(initial as unknown as PageValue);
  const [savedAt, setSavedAt] = useState(initialSavedAt);
  const [by, setBy] = useState(savedBy);
  const [saving, setSaving] = useState(false);
  const [showIssues, setShowIssues] = useState(false);
  const [open, setOpen] = useState<Set<string>>(() => new Set([sections.find(([key]) => key !== "seo")?.[0] ?? sections[0][0]]));
  const [preview, setPreview] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const defaultValue = defaults as unknown as PageValue;

  const dirty = !same(value, saved);
  const issues = useMemo(() => validatePage(pageKey, value), [pageKey, value]);
  const visibleIssues = showIssues ? issues : [];

  const issueFor = (section: string, field: string) => visibleIssues.find((issue) => issue.section === section && issue.field === field && issue.row === undefined)?.message;
  const leafIssue = (section: string, field: string, row: number, leaf: string) =>
    visibleIssues.find((issue) => issue.section === section && issue.field === field && issue.row === row && issue.leaf === leaf)?.message.replace(/^[^:]+:\s*/, "");

  const setField = (section: string, field: string, next: string | Row[]) => setValue((current) => ({ ...current, [section]: { ...current[section], [field]: next } }));

  const jumpTo = (section: string) => {
    setOpen((current) => new Set(current).add(section));
    requestAnimationFrame(() => sectionRefs.current[section]?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const save = async () => {
    if (issues.length) {
      setShowIssues(true);
      jumpTo(issues[0].section);
      toast.error(issues.length === 1 ? issues[0].message : `${issues.length} things to fix before saving. The first: ${issues[0].message}`);
      return;
    }
    setSaving(true);
    const result = await saveSiteContent(pageKey, value as unknown as SiteContent[K]).catch(() => ({ ok: false as const, message: "Could not reach the server. Your edits are still here; try again.", issues: undefined }));
    setSaving(false);
    if (!result.ok) {
      if (result.issues?.length) setShowIssues(true);
      toast.error(result.message);
      return;
    }
    const next = result.page as unknown as PageValue;
    setValue(next);
    setSaved(next);
    setSavedAt(result.at);
    setBy(result.by);
    setShowIssues(false);
    setPreviewKey((key) => key + 1);
    toast.success(page.path === null ? "Saved. Every public page shows the new header and footer." : `Saved. ${page.label} is showing this version now.`);
    router.refresh();
  };

  useEditorGuards(dirty, () => void save());

  const sectionIssues = (section: string): ContentIssue[] => visibleIssues.filter((issue) => issue.section === section);
  const allOpen = open.size === sections.length;

  return (
    <div className="space-y-4">
      <SaveBar dirty={dirty} saving={saving} savedAt={savedAt} onSave={() => void save()}>
        <a href={previewUrl(page.path)} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
          <ExternalLink className="h-3.5 w-3.5" /> View live page
        </a>
        <button type="button" className={btnGhost} disabled={!dirty} onClick={() => setValue(saved)} title="Drop everything since the last save">
          <Undo2 className="h-3.5 w-3.5" /> Discard changes
        </button>
        <button type="button" className={btnGhost} disabled={same(value, defaultValue)} onClick={() => setValue(defaultValue)} title="Put the whole page back to the launch wording. Nothing changes on the site until you save.">
          <RotateCcw className="h-3.5 w-3.5" /> Reset page
        </button>
        <button type="button" className={`${btnGhost} hidden xl:inline-flex`} onClick={() => setPreview((shown) => !shown)}>
          {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {preview ? "Hide preview" : "Show preview"}
        </button>
      </SaveBar>

      {savedAt && by ? <p className="px-1 text-[12px] text-dim">Last saved by {by}.</p> : !savedAt ? <p className="px-1 text-[12px] text-dim">Showing the launch wording. Nothing has been saved for this page yet.</p> : null}

      {visibleIssues.length ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-danger">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">{visibleIssues.length === 1 ? "One thing to fix before saving" : `${visibleIssues.length} things to fix before saving`}</p>
            <ul className="mt-1 space-y-0.5">
              {visibleIssues.slice(0, 6).map((issue, index) => (
                <li key={index}>
                  <button type="button" className="text-left underline-offset-2 hover:underline" onClick={() => jumpTo(issue.section)}>
                    {(page.sections as Record<string, { label: string }>)[issue.section].label}: {issue.message}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className={`grid items-start gap-5 ${preview ? "xl:grid-cols-[minmax(0,1fr)_420px]" : ""}`}>
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {sections.map(([key, section]) => {
              const changed = !same(value[key], saved[key]);
              const bad = sectionIssues(key).length > 0;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => jumpTo(key)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition ${
                    bad ? "border-red-200 bg-red-50 text-danger" : "border-border bg-white text-mid hover:border-blue/40 hover:text-blue"
                  }`}
                >
                  {changed ? <span className="h-1.5 w-1.5 rounded-full bg-[#d97706]" /> : null}
                  {section.label}
                </button>
              );
            })}
            <button type="button" className={`${btnGhost} ml-auto`} onClick={() => setOpen(allOpen ? new Set() : new Set(sections.map(([key]) => key)))}>
              {allOpen ? "Collapse all" : "Expand all"}
            </button>
          </div>

          {sections.map(([sectionKey, section]) => {
            const expanded = open.has(sectionKey);
            const changed = !same(value[sectionKey], saved[sectionKey]);
            const custom = !same(value[sectionKey], defaultValue[sectionKey]);
            const problems = sectionIssues(sectionKey);
            return (
              <section
                key={sectionKey}
                ref={(node) => {
                  sectionRefs.current[sectionKey] = node;
                }}
                className={`aq-card scroll-mt-20 ${problems.length ? "ring-1 ring-red-200" : ""}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    onClick={() =>
                      setOpen((current) => {
                        const next = new Set(current);
                        if (next.has(sectionKey)) next.delete(sectionKey);
                        else next.add(sectionKey);
                        return next;
                      })
                    }
                    aria-expanded={expanded}
                  >
                    <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-dim transition ${expanded ? "" : "-rotate-90"}`} />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-bold text-ink">{section.label}</span>
                        {changed ? <span className="rounded-full bg-[#fff6e5] px-1.5 py-px text-[10.5px] font-semibold text-[#9a5b00]">Unsaved</span> : null}
                        {problems.length ? <span className="rounded-full bg-red-50 px-1.5 py-px text-[10.5px] font-semibold text-danger">{problems.length} to fix</span> : null}
                      </span>
                      {section.description ? <span className="mt-0.5 block text-[12px] leading-relaxed text-dim">{section.description}</span> : null}
                    </span>
                  </button>
                  {custom ? (
                    <button
                      type="button"
                      className={btnGhost}
                      onClick={() => setValue((current) => ({ ...current, [sectionKey]: defaultValue[sectionKey] }))}
                      title="Put this section back to the launch wording. Nothing changes on the site until you save."
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Reset section
                    </button>
                  ) : null}
                </div>
                {expanded ? (
                  <div className="grid gap-4 border-t border-border px-5 py-4 sm:grid-cols-2">
                    {Object.entries(section.fields).map(([fieldKey, field]) => (
                      <div key={fieldKey} className={isWide(field) ? "sm:col-span-2" : ""}>
                        {field.kind === "list" ? (
                          <ListInput
                            field={field}
                            rows={(value[sectionKey][fieldKey] as Row[]) ?? []}
                            onChange={(rows) => setField(sectionKey, fieldKey, rows)}
                            errors={(row, key) => leafIssue(sectionKey, fieldKey, row, key)}
                            listError={issueFor(sectionKey, fieldKey)}
                          />
                        ) : (
                          <LeafInput
                            field={field}
                            value={(value[sectionKey][fieldKey] as string) ?? ""}
                            onChange={(next) => setField(sectionKey, fieldKey, next)}
                            error={issueFor(sectionKey, fieldKey)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>

        {preview ? (
          <aside className="sticky top-20 hidden xl:block">
            <div className="aq-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <p className="text-[12.5px] font-semibold text-ink">Live page</p>
                <div className="flex items-center gap-1">
                  {dirty ? <span className="text-[11.5px] text-[#9a5b00]">Save to update</span> : null}
                  <button type="button" className={`${btnGhost} px-2`} onClick={() => setPreviewKey((key) => key + 1)} aria-label="Reload preview" title="Reload preview">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="relative h-[calc(100vh-11rem)] overflow-hidden bg-s2">
                <iframe
                  key={previewKey}
                  src={previewUrl(page.path)}
                  title={`${page.label} preview`}
                  className="absolute left-0 top-0 h-[300%] w-[1280px] origin-top-left border-0 bg-white"
                  style={{ transform: "scale(0.328)" }}
                />
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
