"use client";

import { useState, useTransition } from "react";
import { Bot, CalendarRange, Cpu, Gauge, MessagesSquare, RotateCcw, Ship, Sparkles, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { saveAquibotSettings } from "@/app/admin/actions";
import { NumberField, Panel, SaveBar, Switch, useEditorGuards } from "@/components/admin/aquibot/shared";
import { btnGhost, field, label, textarea } from "@/components/admin/ui";
import { AQUIBOT_MODELS, DEFAULT_SETTINGS, type AquibotSettings } from "@/lib/aquibot";

function ModelSelect({ id, label: text, value, onChange, hint }: { id: string; label: string; value: string; onChange: (value: string) => void; hint: string }) {
  const current = AQUIBOT_MODELS.find((item) => item.value === value);
  return (
    <div>
      <label htmlFor={id} className={label}>
        {text}
      </label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={`${field} mt-1.5 h-10 w-full`}>
        {AQUIBOT_MODELS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <p className="mt-1 text-[11.5px] leading-relaxed text-dim">
        {current?.hint}. {hint}
      </p>
    </div>
  );
}

const PLANS = [
  { key: "limitCore", plan: "AQ ONE" },
  { key: "limitGrowth", plan: "AQ Analytics" },
  { key: "limitEnterprise", plan: "AQ ZERO" },
] as const;

const chars = (value: number) => `${Math.round(value / 1000).toLocaleString()}k characters`;

export function SettingsPanel({ initial }: { initial: AquibotSettings }) {
  const [settings, setSettings] = useState(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const dirty = JSON.stringify(settings) !== baseline;

  const set = <K extends keyof AquibotSettings>(key: K) => (value: AquibotSettings[K]) => setSettings((current) => ({ ...current, [key]: value }));

  const save = () =>
    start(async () => {
      const result = await saveAquibotSettings(settings);
      setSettings(result.settings);
      setBaseline(JSON.stringify(result.settings));
      setSavedAt(result.savedAt);
      toast.success("Aquibot settings saved.");
    });

  useEditorGuards(dirty, save);

  const fileTotal = settings.publicFileBudget + settings.privateFileBudget;
  const overBudget = fileTotal > settings.ragTotalBudget;
  const scale = Math.max(settings.ragTotalBudget, fileTotal, 1);
  const introLines = settings.introMessage.split("\n").filter((line) => line.trim());

  return (
    <div className="space-y-5">
      <SaveBar dirty={dirty} saving={saving} savedAt={savedAt} onSave={save}>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Load the built-in values into the form? Nothing changes until you save.")) setSettings(DEFAULT_SETTINGS);
          }}
          className={btnGhost}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Load built-in values
        </button>
      </SaveBar>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel icon={<Gauge className="h-4 w-4" />} title="Monthly message limits" description="Questions each member can ask per calendar month. 0 means unlimited.">
          <div className="grid gap-4 sm:grid-cols-3">
            {PLANS.map(({ key, plan }) => (
              <NumberField
                key={key}
                id={key}
                label={plan}
                value={settings[key]}
                onChange={set(key)}
                unit="/ month"
                hint={settings[key] === 0 ? <span className="font-semibold text-[#1f7a45]">Unlimited</span> : `About ${Math.max(1, Math.round(settings[key] / 22))} per working day`}
              />
            ))}
          </div>
        </Panel>

        <Panel icon={<MessagesSquare className="h-4 w-4" />} title="Conversation memory" description="How much of the chat Aquibot remembers and how long sessions are kept.">
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField id="contextWindow" label="Context window" value={settings.contextWindow} onChange={set("contextWindow")} unit="msgs" hint="Recent messages used to resolve follow-ups." />
            <NumberField id="chatHistoryWindow" label="History sent" value={settings.chatHistoryWindow} onChange={set("chatHistoryWindow")} unit="msgs" hint="Recent turns sent to the model as history." />
            <NumberField
              id="pruneAgeMonths"
              label="Keep sessions"
              value={settings.pruneAgeMonths}
              onChange={set("pruneAgeMonths")}
              unit="months"
              hint={settings.pruneAgeMonths === 0 ? "Kept forever." : "Older sessions are deleted."}
            />
          </div>
        </Panel>
      </div>

      <Panel icon={<Bot className="h-4 w-4" />} title="Intro message" description="The first thing members see when they open Aquibot. Each line becomes its own paragraph.">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
          <div>
            <textarea
              id="introMessage"
              rows={6}
              value={settings.introMessage}
              onChange={(event) => set("introMessage")(event.target.value)}
              aria-label="Intro message"
              className={textarea}
            />
            <p className="mt-1 text-right font-mono text-[11px] text-dim">{settings.introMessage.length} / 2000</p>
          </div>
          <div className="rounded-xl border border-border bg-s2/50 p-4">
            <p className={label}>Hub preview</p>
            <div className="mt-3 flex gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue text-white">
                <Bot className="h-4 w-4" />
              </span>
              <div className="space-y-2 rounded-xl rounded-tl-sm bg-white px-3.5 py-2.5 text-[13px] leading-relaxed text-ink shadow-sm">
                {introLines.length ? introLines.map((line, index) => <p key={index} className={index === introLines.length - 1 && introLines.length > 1 ? "text-[12px] text-mid" : ""}>{line}</p>) : <p className="text-dim">No intro message.</p>}
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel icon={<Sparkles className="h-4 w-4" />} title="Retrieval budget" description="How much source text Aquibot may put in front of the model for one answer.">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField id="ragTotalBudget" label="Total budget" value={settings.ragTotalBudget} onChange={set("ragTotalBudget")} unit="chars" step={1000} hint="Across every source." />
            <NumberField id="maxTopChunks" label="Top chunks" value={settings.maxTopChunks} onChange={set("maxTopChunks")} unit="max" hint="Ranked chunks kept after scoring." />
            <NumberField id="publicFileBudget" label="Public files" value={settings.publicFileBudget} onChange={set("publicFileBudget")} unit="chars" step={1000} hint="Telex and member-visible files, cited by name." />
            <NumberField id="privateFileBudget" label="Private files" value={settings.privateFileBudget} onChange={set("privateFileBudget")} unit="chars" step={1000} hint="Hidden files, used without naming them." />
          </div>
          <div className="mt-5">
            <div className="flex h-3 overflow-hidden rounded-full bg-s2" aria-hidden>
              <span className="bg-blue" style={{ width: `${(settings.publicFileBudget / scale) * 100}%` }} />
              <span className="bg-[#0f8b8d]" style={{ width: `${(settings.privateFileBudget / scale) * 100}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-mid">
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue" />
                  Public {chars(settings.publicFileBudget)}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#0f8b8d]" />
                  Private {chars(settings.privateFileBudget)}
                </span>
              </span>
              <span className="font-mono">of {chars(settings.ragTotalBudget)}</span>
            </div>
            {overBudget ? (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-[#fff6e5] px-3 py-2 text-[12px] text-[#9a5b00]">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Public and private budgets add up to {chars(fileTotal)}, more than the total. The total budget caps them.
              </p>
            ) : null}
          </div>
        </Panel>

        <Panel icon={<CalendarRange className="h-4 w-4" />} title="Ranking and dates" description="Which sources rise to the top when Aquibot scores candidates.">
          <div className="space-y-4">
            <div className="space-y-3">
              <Switch checked={settings.recencyFilter} onChange={set("recencyFilter")} label="Recency filter" description="Skip sources older than the recency window." />
              <div className="pl-0 sm:max-w-[220px]">
                <NumberField id="recencyYears" label="Recency window" value={settings.recencyYears} onChange={set("recencyYears")} unit="years" disabled={!settings.recencyFilter} />
              </div>
            </div>
            <div className="border-t border-border pt-4">
              <Switch checked={settings.benchmarkPriority} onChange={set("benchmarkPriority")} label="Benchmark file priority" description="Rank benchmark price files above other files." />
            </div>
            <div className="border-t border-border pt-4">
              <Switch checked={settings.monthTokenMatching} onChange={set("monthTokenMatching")} label="Month token matching" description="Boost chunks that carry tokens like Mar-2024 when the question names that month." />
            </div>
            <div className="border-t border-border pt-4 sm:max-w-[260px]">
              <NumberField
                id="dateGraceDays"
                label="Date fallback grace"
                value={settings.dateGraceDays}
                onChange={set("dateGraceDays")}
                unit="days"
                hint={settings.dateGraceDays === 0 ? "Off. Only exact dates are used." : "Widens a date search this far each side when nothing is found, and flags the answer as a fallback."}
              />
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel icon={<Cpu className="h-4 w-4" />} title="Models" description="Gemini models used for each answer. Embeddings always use gemini-embedding-001 so the index stays consistent.">
          <div className="grid gap-4 sm:grid-cols-2">
            <ModelSelect id="answerModel" label="Answers" value={settings.answerModel} onChange={set("answerModel")} hint="Writes the reply members read." />
            <ModelSelect id="rewriteModel" label="Follow-up rewriting" value={settings.rewriteModel} onChange={set("rewriteModel")} hint="Turns follow-ups into standalone searches." />
          </div>
        </Panel>

        <Panel icon={<Ship className="h-4 w-4" />} title="Freight requests">
          <Switch
            checked={settings.freightRouting}
            onChange={set("freightRouting")}
            label="Route freight requests from chat"
            description="When a member asks for a freight quote, Aquibot hands it to the freight request flow instead of answering from the knowledge base. Takes effect once the freight request flow moves to this app."
          />
        </Panel>
      </div>
    </div>
  );
}
