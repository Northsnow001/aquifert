"use client";

import { useState, useTransition } from "react";
import { BookOpenText, Bot, ChevronDown, FlaskConical, Loader2, RotateCcw, Sparkles, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { saveReportContent, trySampleBrief } from "@/app/admin/nitrogen-reports/template/actions";
import { Panel, SaveBar, Switch, useEditorGuards } from "@/components/admin/aquibot/shared";
import { btnGhost, btnPrimary, btnSecondary, input, label as labelClass, textarea } from "@/components/admin/ui";
import { BriefView } from "@/components/hub/nitrogen/brief-view";
import { AQUIBOT_MODELS } from "@/lib/aquibot";
import { PACKING, PRODUCTS, SHIPMENT_TYPES, type NitrogenAnswers, type NitrogenBrief, type PulseSignal } from "@/lib/nitrogen/engine";
import { DEFAULT_REFERENCE } from "@/lib/nitrogen/reference";
import { DEFAULT_BRIEF_PROMPT, LIMITS, PULSE_SIGNALS, sampleAnswers, type BriefContent, type BriefDesign } from "@/lib/nitrogen/template";

const words = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

function SignalSelect({ id, value, onChange }: { id: string; value: PulseSignal; onChange: (value: PulseSignal) => void }) {
  return (
    <select id={id} value={value} onChange={(event) => onChange(event.target.value as PulseSignal)} className={`${input} w-36`}>
      {PULSE_SIGNALS.map((signal) => (
        <option key={signal} value={signal}>
          {signal}
        </option>
      ))}
    </select>
  );
}

function TextBox({ id, label, value, onChange, rows = 3, hint }: { id: string; label: string; value: string; onChange: (value: string) => void; rows?: number; hint?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        <span className="font-mono text-[10.5px] text-dim">
          {value.length}/{LIMITS.view}
        </span>
      </div>
      <textarea id={id} value={value} maxLength={LIMITS.view} rows={rows} onChange={(event) => onChange(event.target.value)} className={`${textarea} mt-1.5`} />
      {hint ? <p className="mt-1 text-[11.5px] text-dim">{hint}</p> : null}
    </div>
  );
}

function Group({ title, meta, children, open = false }: { title: string; meta?: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group rounded-xl border border-border bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="text-[13.5px] font-semibold text-ink">{title}</span>
        <span className="flex items-center gap-2 text-[12px] text-dim">
          {meta}
          <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
        </span>
      </summary>
      <div className="grid gap-4 border-t border-border px-4 py-4">{children}</div>
    </details>
  );
}

type Sample = { brief: NitrogenBrief; writer: "ai" | "desk"; fallback?: string; knowledge?: string[]; knowledgeNote?: string; ms: number };

export function ContentPanel({ initial, savedAt: initialSavedAt, aiReady, design }: { initial: BriefContent; savedAt: string | null; aiReady: boolean; design: BriefDesign }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [savedAt, setSavedAt] = useState(initialSavedAt);
  const [saving, startSave] = useTransition();
  const [trying, startTry] = useTransition();
  const [answers, setAnswers] = useState<NitrogenAnswers>(() => sampleAnswers());
  const [sample, setSample] = useState<Sample | null>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const ref = draft.reference;

  const set = <K extends keyof BriefContent>(key: K, value: BriefContent[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const setRef = <K extends keyof BriefContent["reference"]>(key: K, name: string, value: BriefContent["reference"][K][string]) =>
    setDraft((current) => ({ ...current, reference: { ...current.reference, [key]: { ...current.reference[key], [name]: value } } }));

  const save = () =>
    startSave(async () => {
      const result = await saveReportContent(draft).catch(() => ({ ok: false as const, message: "Saving failed. Check your connection and try again." }));
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setSaved(result.content);
      setDraft(result.content);
      setSavedAt(result.at);
      toast.success("Saved. New Nitrogen reports use this from now on. Reports already generated keep their wording.");
    });

  useEditorGuards(dirty, save);

  const trySample = () =>
    startTry(async () => {
      const result = await trySampleBrief(draft, answers).catch(() => ({ ok: false as const, message: "The sample took too long or the connection dropped. Try again." }));
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setSample(result);
      if (result.fallback) toast.warning(result.fallback);
    });

  const loadPrompt = (text: string, what: string) => {
    if (draft.prompt.trim() && draft.prompt !== text && !window.confirm(`Replace the prompt in the editor with the ${what}?`)) return;
    set("prompt", text);
  };

  const toggleProduct = (name: string) =>
    setAnswers((current) => ({ ...current, products: current.products.includes(name) ? current.products.filter((item) => item !== name) : [...current.products, name] }));

  return (
    <div className="space-y-5">
      <SaveBar dirty={dirty} saving={saving} savedAt={savedAt} onSave={save}>
        <button type="button" onClick={() => setDraft(saved)} disabled={!dirty || saving} className={btnGhost}>
          <Undo2 className="h-4 w-4" /> Discard changes
        </button>
      </SaveBar>

      <Panel icon={<Bot className="h-4 w-4" />} title="AI writing" description="When on, Gemini writes each brief from the member's answers, following your prompt and the desk market views below.">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-3">
            <Switch
              checked={draft.aiEnabled}
              onChange={(value) => set("aiEnabled", value)}
              label="Write reports with AI"
              description="Off: every brief uses the fixed desk wording. On: the AI rewrites it for each buyer. If the AI is slow or fails, the member still gets the desk wording."
            />
            <Switch
              checked={draft.useKnowledge}
              onChange={(value) => set("useKnowledge", value)}
              label="Read the knowledge base"
              description="On: before writing, the AI is given the most relevant passages from the Aquibot knowledge base (telex, reports and knowledge-only documents) for the buyer's products, route and months, limited to what their plan may see. Sources are listed on each report in admin, never shown to the member."
            />
            {!aiReady ? (
              <p className="rounded-xl border border-[#f5dfb3] bg-[#fff6e5] px-3.5 py-2.5 text-[12.5px] text-[#9a5b00]">
                The Gemini key is not set on this server, so reports use the desk wording until it is. Aquibot uses the same key.
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="model" className={labelClass}>
              Model
            </label>
            <select id="model" value={draft.model} onChange={(event) => set("model", event.target.value)} disabled={!draft.aiEnabled} className={`${input} mt-1.5`}>
              {AQUIBOT_MODELS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11.5px] text-dim">{AQUIBOT_MODELS.find((item) => item.value === draft.model)?.hint}</p>
          </div>
        </div>
      </Panel>

      <Panel
        icon={<BookOpenText className="h-4 w-4" />}
        title="Report prompt"
        description="The writing guide the AI follows: voice, house style and what each part of the brief must cover."
        actions={
          <>
            <button type="button" onClick={() => loadPrompt(DEFAULT_BRIEF_PROMPT, "built-in prompt")} disabled={draft.prompt === DEFAULT_BRIEF_PROMPT} className={btnGhost}>
              <RotateCcw className="h-3.5 w-3.5" /> Built-in prompt
            </button>
            {saved.previousPrompt ? (
              <button type="button" onClick={() => loadPrompt(saved.previousPrompt, "previous prompt")} className={btnGhost}>
                <Undo2 className="h-3.5 w-3.5" /> Previous prompt
              </button>
            ) : null}
          </>
        }
      >
        <textarea
          value={draft.prompt}
          onChange={(event) => set("prompt", event.target.value)}
          maxLength={LIMITS.prompt}
          rows={24}
          spellCheck={false}
          aria-label="Report prompt"
          className={`${textarea} font-mono text-[12.5px] leading-[1.65] ${draft.aiEnabled ? "" : "opacity-60"}`}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-dim">
          <span className="font-mono">
            {words(draft.prompt).toLocaleString()} words · {draft.prompt.length.toLocaleString()}/{LIMITS.prompt.toLocaleString()} characters
            {draft.prompt !== saved.prompt ? <span className="ml-2 text-[#d97706]">· changed</span> : null}
          </span>
          <span>The system adds a short fixed note asking for the reply in the report&apos;s structure, so you do not need to describe the format.</span>
        </div>
      </Panel>

      <Panel
        icon={<Sparkles className="h-4 w-4" />}
        title="Desk market views"
        description="What the desk currently thinks. The AI writes from these, and the desk wording uses them as they are. Signals show in the Market pulse table."
        actions={
          <button
            type="button"
            className={btnGhost}
            disabled={JSON.stringify(ref) === JSON.stringify(DEFAULT_REFERENCE)}
            onClick={() => {
              if (window.confirm("Put every market view back to the launch wording? Nothing changes for members until you save.")) set("reference", DEFAULT_REFERENCE);
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Launch wording
          </button>
        }
      >
        <div className="space-y-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-dim">Products</p>
          {PRODUCTS.map((name, index) => (
            <Group key={name} title={name} meta={ref.products[name].signal} open={index === 0}>
              <div className="flex items-center gap-3">
                <label htmlFor={`signal-${index}`} className={labelClass}>
                  Signal
                </label>
                <SignalSelect id={`signal-${index}`} value={ref.products[name].signal} onChange={(signal) => setRef("products", name, { ...ref.products[name], signal })} />
              </div>
              <TextBox id={`view-${index}`} label="Market view" value={ref.products[name].view} onChange={(view) => setRef("products", name, { ...ref.products[name], view })} />
              <TextBox id={`note-${index}`} label="Product note" value={ref.products[name].note} onChange={(note) => setRef("products", name, { ...ref.products[name], note })} rows={2} />
            </Group>
          ))}

          <p className="pt-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-dim">Freight and shipment</p>
          {SHIPMENT_TYPES.map((type, index) => (
            <Group key={type} title={type} meta={ref.freight[type].signal}>
              <div className="flex items-center gap-3">
                <label htmlFor={`freight-signal-${index}`} className={labelClass}>
                  Freight signal
                </label>
                <SignalSelect id={`freight-signal-${index}`} value={ref.freight[type].signal} onChange={(signal) => setRef("freight", type, { ...ref.freight[type], signal })} />
              </div>
              <TextBox id={`freight-${index}`} label="Freight view" value={ref.freight[type].view} onChange={(view) => setRef("freight", type, { ...ref.freight[type], view })} rows={2} />
              <TextBox id={`shipping-${index}`} label="Shipment guidance" value={ref.shipping[type]} onChange={(text) => setRef("shipping", type, text)} />
            </Group>
          ))}

          <p className="pt-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-dim">Packing</p>
          {PACKING.map((packing, index) => (
            <Group key={packing} title={packing}>
              <TextBox id={`packing-${index}`} label="Packing guidance" value={ref.packing[packing]} onChange={(text) => setRef("packing", packing, text)} />
            </Group>
          ))}
        </div>
      </Panel>

      <Panel
        icon={<FlaskConical className="h-4 w-4" />}
        title="Try it before saving"
        description="Writes a brief for a made-up buyer with what is in the editor now, saved or not. Nothing is stored and members see no change."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="sample-country" className={labelClass}>
              Destination country
            </label>
            <input id="sample-country" value={answers.destinationCountry} onChange={(event) => setAnswers({ ...answers, destinationCountry: event.target.value })} className={`${input} mt-1.5`} />
          </div>
          <div>
            <label htmlFor="sample-port" className={labelClass}>
              Port
            </label>
            <input id="sample-port" value={answers.destinationPort} onChange={(event) => setAnswers({ ...answers, destinationPort: event.target.value })} className={`${input} mt-1.5`} />
          </div>
          <div>
            <label htmlFor="sample-tonnage" className={labelClass}>
              Annual tonnage (MT)
            </label>
            <input id="sample-tonnage" value={answers.annualTonnage} onChange={(event) => setAnswers({ ...answers, annualTonnage: event.target.value })} className={`${input} mt-1.5`} />
          </div>
          <div>
            <label htmlFor="sample-cargo" className={labelClass}>
              Preferred cargo size (MT)
            </label>
            <input id="sample-cargo" value={answers.cargoSize} onChange={(event) => setAnswers({ ...answers, cargoSize: event.target.value })} placeholder="Optional" className={`${input} mt-1.5`} />
          </div>
          <div>
            <label htmlFor="sample-shipment" className={labelClass}>
              Shipment type
            </label>
            <select id="sample-shipment" value={answers.shipmentType} onChange={(event) => setAnswers({ ...answers, shipmentType: event.target.value })} className={`${input} mt-1.5`}>
              {SHIPMENT_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sample-packing" className={labelClass}>
              Packing
            </label>
            <select id="sample-packing" value={answers.packing} onChange={(event) => setAnswers({ ...answers, packing: event.target.value })} className={`${input} mt-1.5`}>
              {PACKING.map((packing) => (
                <option key={packing}>{packing}</option>
              ))}
            </select>
          </div>
          <fieldset>
            <legend className={labelClass}>Products</legend>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {PRODUCTS.map((name) => {
                const on = answers.products.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleProduct(name)}
                    className={`rounded-full border px-2.5 py-1 text-[12px] font-semibold transition ${on ? "border-blue bg-blue-light text-blue" : "border-border bg-white text-mid hover:text-ink"}`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={trySample} disabled={trying} className={btnPrimary}>
            {trying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {trying ? "Writing the sample…" : "Write a sample brief"}
          </button>
          {sample ? (
            <span className="text-[12.5px] text-mid">
              {sample.writer === "ai" ? "Written by AI" : "Desk wording"} in {(sample.ms / 1000).toFixed(1)}s{sample.fallback ? `. ${sample.fallback}` : ""}
            </span>
          ) : (
            <span className="text-[12.5px] text-dim">AI samples usually take 10 to 30 seconds.</span>
          )}
        </div>
        {sample?.knowledge?.length ? (
          <details className="mt-3 rounded-xl border border-border px-3.5 py-2.5 text-[12.5px]">
            <summary className="cursor-pointer font-semibold text-ink">Knowledge used: {sample.knowledge.length} {sample.knowledge.length === 1 ? "source" : "sources"}</summary>
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-mid">
              {sample.knowledge.map((title) => (
                <li key={title}>{title}</li>
              ))}
            </ul>
          </details>
        ) : sample?.knowledgeNote ? (
          <p className="mt-3 text-[12.5px] text-[#9a5b00]">No knowledge used: {sample.knowledgeNote}</p>
        ) : null}
        {sample ? (
          <div className="mt-5 rounded-2xl bg-s2/60 p-3 sm:p-5">
            <BriefView brief={sample.brief} design={design} />
          </div>
        ) : null}
      </Panel>

      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={!dirty || saving} className={btnSecondary}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
