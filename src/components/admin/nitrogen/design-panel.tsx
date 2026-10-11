"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Download, LayoutList, Loader2, Palette, PanelTop, Quote, RotateCcw, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { saveReportDesign } from "@/app/admin/nitrogen-reports/template/actions";
import { Panel, SaveBar, Switch, useEditorGuards } from "@/components/admin/aquibot/shared";
import { btnGhost, btnSecondary, field, input, label as labelClass, textarea } from "@/components/admin/ui";
import { BriefView } from "@/components/hub/nitrogen/brief-view";
import { buildBrief } from "@/lib/nitrogen/engine";
import type { DeskReference } from "@/lib/nitrogen/reference";
import {
  BRIEF_COLOR_INFO,
  BRIEF_COLOR_KEYS,
  BRIEF_SECTION_INFO,
  DEFAULT_DESIGN,
  isHexColor,
  LIMITS,
  SAMPLE_PARTNER,
  sampleAnswers,
  TEXT_SIZES,
  type BriefDesign,
} from "@/lib/nitrogen/template";

function Text({
  id,
  label,
  value,
  onChange,
  max,
  hint,
  rows,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  max: number;
  hint?: string;
  rows?: number;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        <span className="font-mono text-[10.5px] text-dim">
          {value.length}/{max}
        </span>
      </div>
      {rows ? (
        <textarea id={id} value={value} maxLength={max} rows={rows} onChange={(event) => onChange(event.target.value)} className={`${textarea} mt-1.5`} />
      ) : (
        <input id={id} value={value} maxLength={max} onChange={(event) => onChange(event.target.value)} className={`${input} mt-1.5`} />
      )}
      {hint ? <p className="mt-1 text-[11.5px] text-dim">{hint}</p> : null}
    </div>
  );
}

function ColorField({ id, name, about, value, onChange }: { id: string; name: string; about: string; value: string; onChange: (value: string) => void }) {
  const [text, setText] = useState(value);
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setText(value);
  }
  return (
    <div className="flex items-start gap-3">
      <input
        type="color"
        value={value}
        aria-label={`${name} colour`}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-border bg-white p-1"
      />
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block text-[13px] font-semibold text-ink">
          {name}
        </label>
        <p className="text-[11.5px] leading-snug text-dim">{about}</p>
        <input
          id={id}
          value={text}
          maxLength={7}
          spellCheck={false}
          onChange={(event) => {
            const next = event.target.value.startsWith("#") ? event.target.value : `#${event.target.value}`;
            setText(next);
            if (isHexColor(next)) onChange(next.toLowerCase());
          }}
          className={`${field} mt-1.5 h-8 w-28 font-mono text-[12.5px] ${isHexColor(text) ? "" : "border-red-300"}`}
        />
      </div>
    </div>
  );
}

const PLACEHOLDERS = "{partner} becomes the buyer's company name and {week} the report week.";

export function DesignPanel({ initial, savedAt: initialSavedAt, reference }: { initial: BriefDesign; savedAt: string | null; reference: DeskReference }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [savedAt, setSavedAt] = useState(initialSavedAt);
  const [saving, startSave] = useTransition();
  const [pdf, setPdf] = useState(false);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const brief = useMemo(() => buildBrief(sampleAnswers(), { refNo: "NR-SAMPLE", partner: SAMPLE_PARTNER, reference }), [reference]);

  const set = <K extends keyof BriefDesign>(key: K, value: BriefDesign[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const setColor = (key: keyof BriefDesign["colors"], value: string) =>
    setDraft((current) => ({ ...current, colors: { ...current.colors, [key]: value } }));
  const setQuote = (change: Partial<BriefDesign["quote"]>) => setDraft((current) => ({ ...current, quote: { ...current.quote, ...change } }));
  const setSection = (index: number, change: Partial<BriefDesign["sections"][number]>) =>
    setDraft((current) => ({ ...current, sections: current.sections.map((section, i) => (i === index ? { ...section, ...change } : section)) }));
  const move = (index: number, by: number) =>
    setDraft((current) => {
      const target = index + by;
      if (target < 0 || target >= current.sections.length) return current;
      const sections = [...current.sections];
      [sections[index], sections[target]] = [sections[target], sections[index]];
      return { ...current, sections };
    });

  const save = () =>
    startSave(async () => {
      const result = await saveReportDesign(draft);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setSaved(result.design);
      setDraft(result.design);
      setSavedAt(result.at);
      toast.success("Saved. Every Nitrogen report, old and new, now shows this design.");
    });

  useEditorGuards(dirty, save);

  const downloadSample = async () => {
    setPdf(true);
    try {
      const { downloadBriefPdf } = await import("@/components/hub/nitrogen/brief-pdf");
      await downloadBriefPdf(brief, draft);
    } catch {
      toast.error("The sample PDF could not be made just now.");
    } finally {
      setPdf(false);
    }
  };

  return (
    <div className="space-y-5">
      <SaveBar dirty={dirty} saving={saving} savedAt={savedAt} onSave={save}>
        <button type="button" onClick={() => setDraft(saved)} disabled={!dirty || saving} className={btnGhost}>
          <Undo2 className="h-4 w-4" /> Discard changes
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Put the whole design back to the launch look? Nothing changes for members until you save.")) setDraft(DEFAULT_DESIGN);
          }}
          disabled={JSON.stringify(draft) === JSON.stringify(DEFAULT_DESIGN) || saving}
          className={btnGhost}
        >
          <RotateCcw className="h-4 w-4" /> Launch design
        </button>
      </SaveBar>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Panel icon={<LayoutList className="h-4 w-4" />} title="Sections" description="Order, headings and which sections show. The header and the closing quote stay at the top and bottom.">
            <ol className="space-y-2">
              {draft.sections.map((section, index) => {
                const info = BRIEF_SECTION_INFO[section.key];
                return (
                  <li key={section.key} className={`rounded-xl border border-border p-3 transition ${section.hidden ? "bg-s2/60" : "bg-white"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`flex items-center gap-2 text-[13px] font-semibold ${section.hidden ? "text-dim" : "text-ink"}`}>
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-s2 font-mono text-[10.5px] text-mid">{index + 1}</span>
                        {info.name}
                        {section.hidden ? <span className="rounded-full bg-s3 px-1.5 py-px text-[10.5px] font-semibold text-mid">Hidden</span> : null}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${info.name} up`} className={`${btnGhost} h-7 px-1.5 disabled:opacity-30`}>
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(index, 1)}
                          disabled={index === draft.sections.length - 1}
                          aria-label={`Move ${info.name} down`}
                          className={`${btnGhost} h-7 px-1.5 disabled:opacity-30`}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={!section.hidden}
                          aria-label={`Show ${info.name}`}
                          onClick={() => setSection(index, { hidden: !section.hidden })}
                          className={`relative ml-1 h-5 w-9 shrink-0 rounded-full transition ${section.hidden ? "bg-[#cfd9e2]" : "bg-[#1f7a45]"}`}
                        >
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${section.hidden ? "left-0.5" : "left-[18px]"}`} />
                        </button>
                      </span>
                    </div>
                    <p className="mt-1 text-[11.5px] text-dim">{info.about}</p>
                    <input
                      value={section.heading}
                      maxLength={LIMITS.heading}
                      aria-label={`${info.name} heading`}
                      onChange={(event) => setSection(index, { heading: event.target.value })}
                      className={`${input} mt-2 h-9`}
                    />
                  </li>
                );
              })}
            </ol>
            <p className="mt-3 text-[11.5px] text-dim">In headings, {"{week}"} becomes the report week and {"{product}"} the product name.</p>
          </Panel>

          <Panel icon={<Palette className="h-4 w-4" />} title="Colours and text" description="Used on the page members read and in the PDF they download.">
            <div className="grid gap-4">
              {BRIEF_COLOR_KEYS.map((key) => (
                <ColorField
                  key={key}
                  id={`color-${key}`}
                  name={BRIEF_COLOR_INFO[key].name}
                  about={BRIEF_COLOR_INFO[key].about}
                  value={draft.colors[key]}
                  onChange={(value) => setColor(key, value)}
                />
              ))}
              <button
                type="button"
                onClick={() => set("colors", DEFAULT_DESIGN.colors)}
                disabled={JSON.stringify(draft.colors) === JSON.stringify(DEFAULT_DESIGN.colors)}
                className={`${btnGhost} justify-self-start`}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Launch colours
              </button>
              <div>
                <p className={labelClass}>Text size</p>
                <div className="mt-1.5 inline-flex rounded-lg border border-border bg-s2/60 p-0.5" role="radiogroup" aria-label="Text size">
                  {TEXT_SIZES.map((size) => (
                    <button
                      key={size.value}
                      type="button"
                      role="radio"
                      aria-checked={draft.textSize === size.value}
                      onClick={() => set("textSize", size.value)}
                      className={`rounded-md px-3 py-1 text-[12.5px] font-semibold transition ${draft.textSize === size.value ? "bg-white text-ink shadow-sm" : "text-mid hover:text-ink"}`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          <Panel icon={<PanelTop className="h-4 w-4" />} title="Header" description={PLACEHOLDERS}>
            <div className="grid gap-4">
              <Switch checked={draft.showLogo} onChange={(value) => set("showLogo", value)} label="Show the Aquifert logo" />
              <Text id="title" label="Title *" value={draft.title} onChange={(value) => set("title", value)} max={LIMITS.title} hint="A | splits the title; the part after it shows in the accent colour on the page." />
              <Text id="subtitle" label="Line under the title" value={draft.subtitle} onChange={(value) => set("subtitle", value)} max={LIMITS.line} hint="Shown in bold. Leave empty to hide it." />
              <Text id="preparedBy" label="Prepared by" value={draft.preparedBy} onChange={(value) => set("preparedBy", value)} max={LIMITS.line} />
              <Text id="confidential" label="Confidentiality note" value={draft.confidential} onChange={(value) => set("confidential", value)} max={LIMITS.line} hint="Follows the week and date." />
              <Text id="disclaimer" label="Disclaimer strip" value={draft.disclaimer} onChange={(value) => set("disclaimer", value)} max={LIMITS.disclaimer} rows={3} hint="Leave empty to hide the strip." />
              <Text id="viewLabel" label="Commentary box label *" value={draft.viewLabel} onChange={(value) => set("viewLabel", value)} max={LIMITS.label} hint="The tag on The position and Recommendations boxes." />
            </div>
          </Panel>

          <Panel icon={<Quote className="h-4 w-4" />} title="Closing" description="The quote and footer at the end of the report.">
            <div className="grid gap-4">
              <Switch checked={!draft.quote.hidden} onChange={(value) => setQuote({ hidden: !value })} label="Show the closing quote" />
              <Text id="quote" label="Quote" value={draft.quote.text} onChange={(value) => setQuote({ text: value })} max={LIMITS.quote} rows={2} />
              <Text id="quoteSource" label="Quote source" value={draft.quote.source} onChange={(value) => setQuote({ source: value })} max={LIMITS.line} />
              <Text id="footer" label="Footer" value={draft.footer} onChange={(value) => set("footer", value)} max={LIMITS.line} hint="Printed on every PDF page. Leave empty to hide it." />
            </div>
          </Panel>
        </div>

        <section className="aq-card overflow-hidden xl:sticky xl:top-20">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
            <div>
              <h2 className="text-[14px] font-bold text-ink">Preview</h2>
              <p className="mt-0.5 text-[12px] text-dim">A sample brief in this design, before you save. The PDF uses the same settings.</p>
            </div>
            <button type="button" onClick={downloadSample} disabled={pdf} className={btnSecondary}>
              {pdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Sample PDF
            </button>
          </div>
          <div className="max-h-[calc(100vh-200px)] overflow-auto bg-s2/60 p-3 sm:p-5">
            <BriefView brief={brief} design={draft} />
          </div>
        </section>
      </div>
    </div>
  );
}
