"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { PricePoint } from "@/lib/aq-modules/types";
import { formatDay } from "@/lib/content-types";
import { num, signedPct, toneFor, TONE_TEXT } from "@/components/hub/analytics/format";
import { segItem, segOff, segOn, segWrap } from "@/components/hub/analytics/ui";

const RANGES = [
  { key: "3M", months: 3, label: "3 months" },
  { key: "6M", months: 6, label: "6 months" },
  { key: "1Y", months: 12, label: "1 year" },
  { key: "All", months: 0, label: "All history" },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const COLOR = { up: "#1f9d60", down: "#d14b3f", flat: "#2f6fb3" };

function monthsBefore(date: string, months: number) {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 - months, d)).toISOString().slice(0, 10);
}

const shortDay = (date: string, withYear: boolean) => {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return withYear ? `${MONTHS[m - 1]} ${String(y).slice(2)}` : `${d} ${MONTHS[m - 1]}`;
};

/** Edge-aware horizontal anchoring so labels near the sides stay inside the plot. */
const anchor = (pct: number) => (pct < 16 ? "translateX(0)" : pct > 84 ? "translateX(-100%)" : "translateX(-50%)");

/**
 * Line chart with a hover or keyboard crosshair. The SVG stretches to the box; every label is HTML
 * positioned in percentages so text stays legible at phone widths.
 */
export function PriceChart({ title, unit, points, initialRange = "1Y", height = "h-60 sm:h-72" }: { title: string; unit: string; points: PricePoint[]; initialRange?: RangeKey; height?: string }) {
  const [range, setRange] = useState<RangeKey>(initialRange);
  const [hover, setHover] = useState<number | null>(null);
  const plot = useRef<HTMLDivElement>(null);
  const gradient = `pc-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const visible = useMemo(() => {
    const months = RANGES.find((item) => item.key === range)?.months ?? 0;
    const last = points.at(-1)?.date;
    if (!months || !last) return points;
    const from = monthsBefore(last, months);
    const inRange = points.filter((point) => point.date >= from);
    return inRange.length >= 2 ? inRange : points.slice(-2);
  }, [points, range]);

  if (points.length < 2) {
    return <p className="rounded-2xl border border-dashed border-border px-5 py-10 text-center text-[14.5px] text-mid">The desk needs at least two prices on this series to draw a chart.</p>;
  }

  const n = visible.length;
  const values = visible.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.14 || Math.abs(max) * 0.02 || 1;
  const lo = min - pad;
  const hi = max + pad;
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * 1000 : 500);
  const y = (value: number) => 1000 - ((value - lo) / (hi - lo)) * 1000;
  const line = visible.map((point, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(point.value).toFixed(1)}`).join(" ");
  const first = visible[0];
  const last = visible[n - 1];
  const changePct = first.value ? Math.round(((last.value - first.value) / first.value) * 1000) / 10 : 0;
  const tone = toneFor(changePct);
  const color = COLOR[tone];
  const maxIndex = values.indexOf(max);
  const minIndex = values.indexOf(min);
  const ticks = max === min ? [max] : [0, 1, 2, 3].map((k) => min + ((max - min) * k) / 3);
  const spanDays = (Date.parse(last.date) - Date.parse(first.date)) / 86_400_000;
  const xLabels = [...new Set([0, 1, 2, 3, 4].map((k) => Math.round((k * (n - 1)) / 4)))];
  const active = hover === null ? null : visible[Math.min(hover, n - 1)];
  const activeIndex = hover === null ? null : Math.min(hover, n - 1);

  const pick = (clientX: number) => {
    const rect = plot.current?.getBoundingClientRect();
    if (!rect || !rect.width) return;
    const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setHover(Math.round(fraction * (n - 1)));
  };

  const onKey = (event: React.KeyboardEvent) => {
    const current = hover ?? n - 1;
    const next = event.key === "ArrowLeft" ? current - 1 : event.key === "ArrowRight" ? current + 1 : event.key === "Home" ? 0 : event.key === "End" ? n - 1 : null;
    if (next === null) return;
    event.preventDefault();
    setHover(Math.min(n - 1, Math.max(0, next)));
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-mid">
            {formatDay(first.date)} to {formatDay(last.date)}
          </p>
          <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-ink">
            <span className="text-[24px] font-semibold tabular-nums tracking-[-0.02em]">{num(last.value)}</span>
            <span className="text-[13.5px] text-dim">{unit}</span>
            <span className={`text-[14.5px] font-semibold tabular-nums ${TONE_TEXT[tone]}`}>{signedPct(changePct)} over the range</span>
          </p>
        </div>
        <div className={segWrap} role="group" aria-label="Chart range">
          {RANGES.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={range === item.key}
              title={item.label}
              onClick={() => {
                setRange(item.key);
                setHover(null);
              }}
              className={`aq-nopress ${segItem} ${range === item.key ? segOn : segOff}`}
            >
              {item.key}
            </button>
          ))}
        </div>
      </div>

      <div className="pr-14">
        <div
          ref={plot}
          tabIndex={0}
          role="img"
          aria-label={`${title}, ${unit}. ${n} prices from ${formatDay(first.date)} to ${formatDay(last.date)}, from ${num(first.value)} to ${num(last.value)}. High ${num(max)}, low ${num(min)}. Use the arrow keys to read each price.`}
          onPointerMove={(event) => pick(event.clientX)}
          onPointerDown={(event) => pick(event.clientX)}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onKey}
          onFocus={() => setHover((value) => value ?? n - 1)}
          onBlur={() => setHover(null)}
          className={`relative ${height} cursor-crosshair touch-pan-y select-none rounded-lg outline-offset-4`}
        >
          <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
            <defs>
              <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={color} stopOpacity="0.2" />
                <stop offset="1" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((tick) => (
              <line key={tick} x1="0" x2="1000" y1={y(tick)} y2={y(tick)} stroke="#e3e9ef" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />
            ))}
            <path d={`${line} L1000,1000 L0,1000 Z`} fill={`url(#${gradient})`} />
            <path d={line} fill="none" stroke={color} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            {activeIndex !== null ? <line x1={x(activeIndex)} x2={x(activeIndex)} y1="0" y2="1000" stroke="#10263b" strokeOpacity="0.35" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" /> : null}
          </svg>

          {ticks.map((tick) => (
            <span key={tick} className="pointer-events-none absolute left-full ml-2 -translate-y-1/2 font-mono text-[11.5px] tabular-nums text-dim" style={{ top: `${y(tick) / 10}%` }}>
              {num(tick)}
            </span>
          ))}

          {[
            { i: maxIndex, text: `High ${num(max)}`, above: true },
            { i: minIndex, text: `Low ${num(min)}`, above: false },
          ]
            .filter((mark, k) => k === 0 || mark.i !== maxIndex)
            .map((mark) => (
              <span
                key={mark.text}
                className={`pointer-events-none absolute whitespace-nowrap rounded-md bg-white/90 px-1.5 py-0.5 text-[11.5px] font-semibold tabular-nums shadow-sm ring-1 ring-border ${mark.above ? "text-[#1b7a47]" : "text-[#b53a2f]"}`}
                style={{ left: `${x(mark.i) / 10}%`, top: `calc(${y(values[mark.i]) / 10}% ${mark.above ? "- 26px" : "+ 8px"})`, transform: anchor(x(mark.i) / 10) }}
              >
                {mark.text}
              </span>
            ))}

          {active && activeIndex !== null ? (
            <>
              <span
                className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
                style={{ left: `${x(activeIndex) / 10}%`, top: `${y(active.value) / 10}%`, background: color }}
              />
              <div
                className="pointer-events-none absolute top-1 z-10 min-w-[128px] rounded-xl border border-border bg-white/95 px-3 py-2 shadow-[var(--aq-shadow-card)] backdrop-blur"
                style={{ left: `${x(activeIndex) / 10}%`, transform: anchor(x(activeIndex) / 10) }}
              >
                <p className="font-mono text-[11.5px] uppercase tracking-wide text-dim">{formatDay(active.date)}</p>
                <p className="text-[16.5px] font-semibold tabular-nums text-ink">
                  {num(active.value)} <span className="text-[12px] font-medium text-dim">{unit}</span>
                </p>
                {activeIndex > 0 ? (
                  <p className="text-[12px] tabular-nums text-mid">{signedPct(first.value ? Math.round(((active.value - first.value) / first.value) * 1000) / 10 : 0)} since range start</p>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        <div className="relative mt-2 h-4" aria-hidden>
          {xLabels.map((i, k) => (
            <span
              key={i}
              className={`absolute whitespace-nowrap font-mono text-[11.5px] text-dim ${k % 2 === 1 ? "hidden sm:block" : ""}`}
              style={{ left: `${x(i) / 10}%`, transform: i === 0 ? "translateX(0)" : i === n - 1 ? "translateX(-100%)" : "translateX(-50%)" }}
            >
              {shortDay(visible[i].date, spanDays > 300)}
            </span>
          ))}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {active ? `${formatDay(active.date)}: ${num(active.value)} ${unit}` : ""}
      </p>
      <table className="sr-only">
        <caption>
          {title} prices, {unit}
        </caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Price ({unit})</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((point) => (
            <tr key={point.date}>
              <td>{formatDay(point.date)}</td>
              <td>{num(point.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
