"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveWeeklyPrices } from "@/app/admin/aq-data/actions";
import { btnPrimary, field, label } from "@/components/admin/ui";
import type { MarketSeries } from "@/lib/aq-modules/types";
import { formatDay } from "@/lib/content-types";

const CHECK_PCT = 15;

const latestOf = (series: MarketSeries) => series.points.reduce<MarketSeries["points"][number] | null>((best, point) => (!best || point.date > best.date ? point : best), null);
const beforeOf = (series: MarketSeries, date: string) =>
  series.points.reduce<MarketSeries["points"][number] | null>((best, point) => (point.date < date && (!best || point.date > best.date) ? point : best), null);

export function WeeklyPrices({ series, today }: { series: MarketSeries[]; today: string }) {
  const router = useRouter();
  const [date, setDate] = useState(today);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, startSave] = useTransition();
  const filled = Object.entries(values).filter(([, value]) => value.trim() !== "" && Number.isFinite(Number(value)));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!filled.length) {
      toast.error("Enter at least one price.");
      return;
    }
    startSave(async () => {
      const result = await saveWeeklyPrices(date, Object.fromEntries(filled.map(([id, value]) => [id, Number(value)])));
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`Saved ${filled.length} ${filled.length === 1 ? "price" : "prices"} for ${formatDay(date)}.`);
      setValues({});
      router.refresh();
    });
  };

  if (!series.length) return <p className="px-5 py-8 text-center text-[13px] text-dim">Add a series below to start entering prices.</p>;

  return (
    <form onSubmit={submit}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-3">
        <div>
          <label htmlFor="weekly-date" className={label}>
            Price date
          </label>
          <input id="weekly-date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} className={`${field} mt-1.5 h-10 w-44`} />
        </div>
        <p className="max-w-md text-[12px] text-mid">Leave a row blank to skip it. A price on a date that already has one replaces it.</p>
      </div>
      <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_140px_150px] gap-3 border-b border-border bg-s2/50 px-5 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-dim md:grid">
        <span>Series</span>
        <span>Latest</span>
        <span>New price</span>
        <span>Change</span>
      </div>
      <ul>
        {series.map((item) => {
          const latest = latestOf(item);
          const existing = item.points.find((point) => point.date === date);
          const previous = beforeOf(item, date);
          const raw = values[item.id] ?? "";
          const value = raw.trim() === "" ? null : Number(raw);
          const change = value !== null && Number.isFinite(value) && previous?.value ? ((value - previous.value) / previous.value) * 100 : null;
          return (
            <li key={item.id} className="grid grid-cols-1 items-center gap-2 border-b border-border px-5 py-2.5 last:border-b-0 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_140px_150px] md:gap-3">
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-semibold text-ink">{item.label}</span>
                <span className="block truncate text-[12px] text-mid">
                  {item.basis || item.group} · {item.unit}
                </span>
              </span>
              <span className="font-mono text-[12px] text-mid">{latest ? `${latest.value} · ${formatDay(latest.date)}` : "No prices yet"}</span>
              <span>
                <input
                  type="number"
                  step="any"
                  min={0}
                  inputMode="decimal"
                  value={raw}
                  onChange={(event) => setValues((current) => ({ ...current, [item.id]: event.target.value }))}
                  placeholder={existing ? String(existing.value) : latest ? String(latest.value) : ""}
                  aria-label={`${item.label} ${item.basis} price for ${date}`}
                  className={`${field} h-9 w-full font-mono`}
                />
              </span>
              <span className="text-[12px]">
                {change !== null ? (
                  <span className={`font-mono font-semibold ${Math.abs(change) >= CHECK_PCT ? "text-[#9a5b00]" : change > 0 ? "text-[#1f7a45]" : change < 0 ? "text-danger" : "text-mid"}`}>
                    {change >= 0 ? "+" : ""}
                    {change.toFixed(1)}%{Math.abs(change) >= CHECK_PCT ? " · check" : ""}
                  </span>
                ) : existing ? (
                  <span className="text-dim">Replaces {existing.value}</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-3">
        <span className="text-[12px] text-dim">{filled.length ? `${filled.length} of ${series.length} filled` : "Nothing entered yet"}</span>
        <button type="submit" className={btnPrimary} disabled={saving || !filled.length}>
          {saving ? "Saving…" : `Save prices for ${formatDay(date)}`}
        </button>
      </div>
    </form>
  );
}
