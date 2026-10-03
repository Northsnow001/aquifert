"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, LoaderCircle, Minus, Plus } from "lucide-react";
import { saveIndicatorReadings } from "@/app/admin/actions";
import { field, label, textarea } from "@/components/admin/ui";
import { formatStamp, type Indicator } from "@/lib/content-types";

const COLORS = ["#16a34a", "#d97706", "#dc2626"];
const ARC = Math.PI * 46;
const CAPTION_LIMIT = 110;
const PRESETS = [
  { label: "Bearish", value: 20, min: 0, max: 33 },
  { label: "Neutral", value: 50, min: 34, max: 66 },
  { label: "Bullish", value: 80, min: 67, max: 100 },
];

type Status = "idle" | "pending" | "saving" | "saved" | "error";

function stance(value: number) {
  return PRESETS.find((preset) => value >= preset.min && value <= preset.max)?.label ?? "Neutral";
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function SaveState({ status, savedAt }: { status: Status; savedAt: string | null }) {
  if (status === "pending" || status === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-mid">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
        Saving…
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-danger">
        <CircleAlert className="h-3.5 w-3.5" />
        Not saved. Check your connection. Your next change retries.
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#1f7a45]">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {savedAt ? `Live on the hub · saved ${formatStamp(savedAt)}` : "Live on the hub"}
    </span>
  );
}

export function IndicatorsForm({ indicators, updatedAt }: { indicators: Indicator[]; updatedAt: string | null }) {
  const [items, setItems] = useState(indicators);
  const [status, setStatus] = useState<Status>("idle");
  const [savedAt, setSavedAt] = useState(updatedAt);
  const savedJson = useRef(JSON.stringify(indicators));

  const patch = (index: number, change: Partial<Indicator>) => setItems((current) => current.map((item, i) => (i === index ? { ...item, ...change } : item)));

  useEffect(() => {
    const json = JSON.stringify(items);
    if (json === savedJson.current) return;
    setStatus("pending");
    const timer = setTimeout(async () => {
      setStatus("saving");
      try {
        const result = await saveIndicatorReadings(items);
        savedJson.current = json;
        setSavedAt(result.savedAt);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [items]);

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (status === "pending" || status === "saving") event.preventDefault();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [status]);

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface/95 px-4 py-2.5 shadow-sm backdrop-blur">
        <p className="text-[12.5px] text-mid">Set each reading with a preset, the slider or the number. Changes save on their own.</p>
        <SaveState status={status} savedAt={savedAt} />
      </div>

      {items.map((item, index) => {
        const color = COLORS[index] ?? "#2e6da4";
        const current = stance(item.value);
        return (
          <section
            key={item.name}
            className="grid gap-5 rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(26,58,92,0.05)] lg:grid-cols-[200px_minmax(0,1fr)_minmax(0,1.25fr)]"
          >
            <div className="flex flex-col items-center justify-center rounded-xl bg-s2/50 px-3 py-4">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-mid">{item.name}</p>
              <svg className="mt-1 h-20 w-full max-w-[180px]" viewBox="0 0 120 74" aria-hidden>
                <path d="M14 64 A 46 46 0 0 1 106 64" fill="none" stroke="#e7eef3" strokeWidth="8" strokeLinecap="round" />
                <path
                  d="M14 64 A 46 46 0 0 1 106 64"
                  fill="none"
                  stroke={color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(item.value / 100) * ARC} ${ARC}`}
                  className="transition-[stroke-dasharray] duration-200"
                />
                <text x="60" y="58" textAnchor="middle" fill="#1a3a5c" fontSize="22" fontWeight="700">
                  {item.value}
                </text>
              </svg>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color }}>
                {current}
              </p>
            </div>

            <div className="flex flex-col justify-center gap-4">
              <div>
                <p className={label}>Stance</p>
                <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-lg bg-s2 p-1" role="radiogroup" aria-label={`${item.name} stance`}>
                  {PRESETS.map((preset) => {
                    const active = current === preset.label;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => patch(index, { value: preset.value })}
                        className={`h-8 rounded-md text-[12.5px] font-semibold transition ${active ? "bg-white text-ink shadow-sm" : "text-mid hover:text-ink"}`}
                        style={active ? { color } : undefined}
                        title={`${preset.min}–${preset.max}. Sets ${preset.value}.`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className={label} htmlFor={`value-${item.name}`}>
                  Reading
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={item.value}
                    onChange={(event) => patch(index, { value: Number(event.target.value) })}
                    className="min-w-0 flex-1"
                    style={{ accentColor: color }}
                    aria-label={`${item.name} reading slider`}
                  />
                  <div className="flex items-center rounded-lg border border-border bg-white">
                    <button type="button" onClick={() => patch(index, { value: clamp(item.value - 1) })} className="flex h-9 w-7 items-center justify-center text-mid hover:text-ink" aria-label="Decrease">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      id={`value-${item.name}`}
                      type="number"
                      min={0}
                      max={100}
                      value={item.value}
                      onChange={(event) => patch(index, { value: clamp(Number(event.target.value) || 0) })}
                      className="h-9 w-12 border-x border-border text-center font-mono text-[13.5px] text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button type="button" onClick={() => patch(index, { value: clamp(item.value + 1) })} className="flex h-9 w-7 items-center justify-center text-mid hover:text-ink" aria-label="Increase">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-1.5 flex justify-between font-mono text-[10px] uppercase text-dim">
                  <span>0 Bearish</span>
                  <span>50 Neutral</span>
                  <span>Bullish 100</span>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <div>
                <div className="flex items-end justify-between">
                  <label className={label} htmlFor={`summary-${item.name}`}>
                    Caption under the dial
                  </label>
                  <span className={`font-mono text-[11px] ${item.summary.length > CAPTION_LIMIT ? "text-[#9a5b00]" : "text-dim"}`}>
                    {item.summary.length}/{CAPTION_LIMIT}
                  </span>
                </div>
                <input
                  id={`summary-${item.name}`}
                  value={item.summary}
                  onChange={(event) => patch(index, { summary: event.target.value })}
                  placeholder="One line members read under the dial"
                  className={`${field} mt-1.5 h-10 w-full`}
                />
              </div>
              <div>
                <label className={label} htmlFor={`note-${item.name}`}>
                  Notes <span className="font-normal normal-case tracking-normal text-dim">(optional, shown in Market Analysis)</span>
                </label>
                <textarea
                  id={`note-${item.name}`}
                  rows={3}
                  value={item.note}
                  onChange={(event) => patch(index, { note: event.target.value })}
                  className={`${textarea} mt-1.5`}
                />
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
