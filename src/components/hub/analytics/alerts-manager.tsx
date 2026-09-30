"use client";

import { useState, useTransition } from "react";
import { BellPlus, BellRing, Check, ChevronDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { btnPrimary, btnSecondary, fieldClass, hintClass, labelClass } from "@/components/app/form";
import { createAlert, removeAlert, saveBriefPrefs, toggleAlert } from "@/app/hub/analytics/actions";
import { MAX_ALERTS, num } from "@/components/hub/analytics/format";
import { Switch } from "@/components/hub/analytics/switch";
import { segItem, segOff, segOn, segWrap } from "@/components/hub/analytics/ui";
import { formatDay } from "@/lib/content-types";

export type SeriesOption = { id: string; label: string; basis: string; unit: string; group: string; latest: { date: string; value: number } | null };

export type AlertRow = {
  id: string;
  seriesId: string;
  label: string;
  basis: string;
  unit: string;
  direction: "above" | "below";
  threshold: number;
  note: string;
  active: boolean;
  latest: { date: string; value: number } | null;
  triggered: boolean;
  distance: number | null;
  missing: boolean;
};

const QUICK = [-5, -2, 2, 5];

const tidy = (value: number) => (Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 100) / 100);

function suggest(option: SeriesOption | undefined, direction: "above" | "below") {
  return option?.latest ? String(tidy(option.latest.value * (direction === "above" ? 1.05 : 0.95))) : "";
}

function liveHint(option: SeriesOption | undefined, direction: "above" | "below", threshold: number) {
  if (!option?.latest) return "This series has no published price yet, so the alert waits for the first one.";
  const latest = option.latest.value;
  const now = `Currently ${num(latest)} ${option.unit}`;
  if (!Number.isFinite(threshold) || threshold <= 0) return `${now} (${formatDay(option.latest.date)}). Set the price that should trigger the alert.`;
  const hit = direction === "above" ? latest >= threshold : latest <= threshold;
  if (hit) return `${now}, already ${direction === "above" ? "at or above" : "at or below"} ${num(threshold)}. The alert shows as hit straight away.`;
  const pct = Math.abs(((threshold - latest) / latest) * 100);
  return `${now}, ${pct.toFixed(1)}% ${direction === "above" ? "below" : "above"} your threshold.`;
}

export function AlertsManager({ series, alerts }: { series: SeriesOption[]; alerts: AlertRow[] }) {
  const firstPriced = series.find((item) => item.latest) ?? series[0];
  const [seriesId, setSeriesId] = useState(firstPriced?.id ?? "");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [threshold, setThreshold] = useState(() => suggest(firstPriced, "above"));
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [, startRow] = useTransition();

  const option = series.find((item) => item.id === seriesId);
  const groups = [...new Set(series.map((item) => item.group))];
  const full = alerts.length >= MAX_ALERTS;
  const value = Number(threshold);
  const triggered = alerts.filter((row) => row.triggered);
  const ordered = [...alerts].sort((a, b) => Number(b.triggered) - Number(a.triggered) || Number(b.active) - Number(a.active) || a.label.localeCompare(b.label));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!option) return toast.error("Choose a price series.");
    if (!Number.isFinite(value) || value <= 0) return toast.error("Enter a threshold price greater than zero.");
    startSave(async () => {
      const result = await createAlert({ seriesId, direction, threshold: value, note });
      if (result.ok) {
        toast.success(result.message ?? "Alert set.");
        setNote("");
      } else toast.error(result.message);
    });
  };

  const rowAction = (id: string, run: () => Promise<{ ok: boolean; message?: string }>) => {
    setBusy(id);
    startRow(async () => {
      const result = await run();
      setBusy(null);
      setConfirming(null);
      if (result.ok) toast.success(result.message ?? "Saved.");
      else toast.error(result.message ?? "That did not save. Try again.");
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <section className="aq-card p-5 xl:col-span-2" aria-labelledby="new-alert">
        <h2 id="new-alert" className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <BellPlus className="h-4 w-4 text-blue" aria-hidden /> New price alert
        </h2>
        <p className="mt-1 text-[12.5px] text-mid">Alerts are checked every time the desk updates prices. Hits show here and on your dashboard.</p>

        {!series.length ? (
          <p className="mt-4 rounded-xl bg-s2 px-4 py-3 text-[13px] text-mid">Alerts open up as soon as the desk publishes its first price series.</p>
        ) : (
          <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
            <div>
              <label htmlFor="alert-series" className={labelClass}>
                Price series
              </label>
              <div className="relative">
                <select
                  id="alert-series"
                  value={seriesId}
                  onChange={(event) => {
                    const next = series.find((item) => item.id === event.target.value);
                    setSeriesId(event.target.value);
                    setThreshold(suggest(next, direction));
                  }}
                  className={`${fieldClass} appearance-none pr-9`}
                >
                  {groups.map((group) => (
                    <optgroup key={group} label={group}>
                      {series
                        .filter((item) => item.group === group)
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label} · {item.basis}
                            {item.latest ? ` · ${num(item.latest.value)} ${item.unit}` : ""}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" aria-hidden />
              </div>
            </div>

            <fieldset>
              <legend className={labelClass}>Alert me when the price is</legend>
              <div className={segWrap} role="radiogroup" aria-label="Direction">
                {(["above", "below"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="radio"
                    aria-checked={direction === item}
                    onClick={() => setDirection(item)}
                    className={`aq-nopress ${segItem} min-w-[96px] ${direction === item ? segOn : segOff}`}
                  >
                    {item === "above" ? "At or above" : "At or below"}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="alert-threshold" className={labelClass}>
                Threshold {option ? <span className="text-dim">({option.unit})</span> : null}
              </label>
              <input
                id="alert-threshold"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                required
                value={threshold}
                onChange={(event) => setThreshold(event.target.value)}
                aria-describedby="alert-threshold-hint"
                className={`${fieldClass} tabular-nums`}
              />
              <p id="alert-threshold-hint" className={hintClass} aria-live="polite">
                {liveHint(option, direction, value)}
              </p>
              {option?.latest ? (
                <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Quick set from the latest price">
                  <span className="text-[11.5px] text-dim">Quick set:</span>
                  {QUICK.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setThreshold(String(tidy(option.latest!.value * (1 + pct / 100))));
                        setDirection(pct > 0 ? "above" : "below");
                      }}
                      className="aq-nopress rounded-full border border-border bg-white px-2.5 py-1 text-[12px] font-semibold tabular-nums text-mid transition hover:border-blue/40 hover:text-blue"
                      title={`${pct > 0 ? "Above" : "Below"} ${num(tidy(option.latest!.value * (1 + pct / 100)))} ${option.unit}`}
                    >
                      {pct > 0 ? "+" : "−"}
                      {Math.abs(pct)}%
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <label htmlFor="alert-note" className={labelClass}>
                Note <span className="text-dim">(optional)</span>
              </label>
              <input id="alert-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder="e.g. Cover Q4 if urea breaks 450" className={fieldClass} />
            </div>

            <button type="submit" disabled={saving || full} className={btnPrimary}>
              <BellRing className="h-4 w-4" aria-hidden /> {saving ? "Setting alert…" : "Set alert"}
            </button>
            <p className="-mt-2 text-center text-[12px] text-dim">
              {full ? `You have ${MAX_ALERTS} alerts, the most a member can hold. Delete one to add another.` : `${alerts.length} of ${MAX_ALERTS} alerts in use`}
            </p>
          </form>
        )}
      </section>

      <section className="aq-card flex min-w-0 flex-col overflow-hidden xl:col-span-3" aria-labelledby="your-alerts">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3.5">
          <h2 id="your-alerts" className="text-[15px] font-semibold text-ink">
            Your alerts
          </h2>
          {alerts.length ? (
            <p className={`text-[12.5px] font-semibold ${triggered.length ? "text-danger" : "text-mid"}`}>{triggered.length ? `${triggered.length} hit` : `${alerts.filter((row) => row.active).length} watching`}</p>
          ) : null}
        </header>
        {!alerts.length ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <BellRing className="h-6 w-6 text-dim" aria-hidden />
            <p className="text-[14px] font-semibold text-ink">No alerts yet</p>
            <p className="max-w-sm text-[13px] leading-relaxed text-mid">Pick a series, choose above or below and set your price. Quick-set chips put the threshold a few percent from today&apos;s level.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {ordered.map((row) => {
              const pct = row.latest && row.distance !== null && row.latest.value ? Math.abs((row.distance / row.latest.value) * 100) : null;
              return (
                <li key={row.id} className={`px-5 py-4 transition-colors ${row.triggered ? "bg-red-50/70" : !row.active ? "bg-s2/40" : ""}`}>
                  <div className="flex items-start gap-3">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${row.triggered ? "bg-danger" : row.active ? "bg-teal-500" : "bg-[#c3ced8]"}`} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-ink">
                        {row.label} <span className="font-normal text-mid">· {row.basis}</span>
                      </p>
                      <p className="text-[13px] tabular-nums text-mid">
                        {row.direction === "above" ? "At or above" : "At or below"} <strong className="font-semibold text-ink">{num(row.threshold)}</strong> {row.unit}
                      </p>
                      {row.missing ? (
                        <p className="mt-1 text-[12.5px] text-mid">The desk no longer publishes this series. Delete the alert or set it on another series.</p>
                      ) : row.triggered && row.latest ? (
                        <p className="mt-1 text-[12.5px] font-semibold text-danger">
                          Hit: {num(row.latest.value)} {row.unit} on {formatDay(row.latest.date)}
                        </p>
                      ) : !row.active ? (
                        <p className="mt-1 text-[12.5px] text-dim">Paused{row.latest ? ` · currently ${num(row.latest.value)} ${row.unit}` : ""}</p>
                      ) : row.latest && row.distance !== null ? (
                        <p className="mt-1 text-[12.5px] tabular-nums text-mid">
                          Currently {num(row.latest.value)} {row.unit} · {num(Math.abs(row.distance))} {pct !== null ? `(${pct.toFixed(1)}%)` : ""} to go
                        </p>
                      ) : (
                        <p className="mt-1 text-[12.5px] text-dim">Waiting for the first price</p>
                      )}
                      {row.note ? <p className="mt-1 text-[12.5px] italic text-mid">{row.note}</p> : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Switch checked={row.active} disabled={busy === row.id} label={`${row.active ? "Pause" : "Switch on"} alert for ${row.label} ${row.basis}`} onChange={(next) => rowAction(row.id, () => toggleAlert(row.id, next))} />
                      <button
                        type="button"
                        onClick={() => setConfirming(confirming === row.id ? null : row.id)}
                        aria-label={`Delete alert for ${row.label} ${row.basis}`}
                        aria-expanded={confirming === row.id}
                        className="aq-nopress flex h-8 w-8 items-center justify-center rounded-full text-dim transition hover:bg-red-50 hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                  {confirming === row.id ? (
                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-red-200 bg-white px-3 py-2">
                      <p className="mr-auto text-[12.5px] text-ink">Delete this alert?</p>
                      <button type="button" onClick={() => setConfirming(null)} className={`${btnSecondary} h-8 px-3 text-[12.5px]`}>
                        Keep it
                      </button>
                      <button
                        type="button"
                        disabled={busy === row.id}
                        onClick={() => rowAction(row.id, () => removeAlert(row.id))}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-danger px-3 text-[12.5px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Which products the weekly brief covers; none selected means every product. */
export function BriefProducts({ options, initial }: { options: readonly string[]; initial: string[] }) {
  const [selected, setSelected] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const dirty = selected.length !== saved.length || selected.some((item) => !saved.includes(item));

  const save = () =>
    start(async () => {
      const result = await saveBriefPrefs(selected);
      if (result.ok) {
        setSaved(selected);
        toast.success(result.message ?? "Saved.");
      } else toast.error(result.message);
    });

  return (
    <div>
      <p className="text-[14px] font-semibold text-ink">Products in your brief</p>
      <p className="mt-0.5 text-[12.5px] text-mid">{selected.length ? `Your brief leads with ${selected.join(", ")}.` : "Leave all clear to cover every product."}</p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Brief products">
        {options.map((item) => {
          const on = selected.includes(item);
          return (
            <button
              key={item}
              type="button"
              aria-pressed={on}
              onClick={() => setSelected(on ? selected.filter((value) => value !== item) : [...selected, item])}
              className={`aq-nopress inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition ${on ? "border-blue bg-blue-light text-blue" : "border-border bg-white text-mid hover:border-blue/35 hover:text-ink"}`}
            >
              {on ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
              {item}
            </button>
          );
        })}
      </div>
      <button type="button" onClick={save} disabled={!dirty || pending} className={`${btnPrimary} mt-4 h-10 px-4 text-[13px]`}>
        {pending ? "Saving…" : dirty ? "Save brief products" : "Saved"}
      </button>
    </div>
  );
}
