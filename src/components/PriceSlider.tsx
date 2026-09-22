/**
 * PriceSlider, full-bleed fertilizer market price band, mounted directly
 * below the landing hero.
 *
 * Row 1: section label + region filter (persisted) + prev/next + pause.
 * Row 2: seamless transform-only loop of price cards (60s per pass,
 *        right-to-left), pausing on hover, focus-within and the pause
 *        button (persisted). Arrows step one card and pause auto-scroll.
 * Row 3: "Latest market data · Updated {DD Month YYYY}" + View sources.
 *
 * Hard rules honoured here:
 * - No flashing / blinking / pulsing anywhere, ever.
 * - prefers-reduced-motion → auto-scroll disabled; static user-driven track.
 * - aria-live="off"; full data available in a visually hidden table.
 * - No placeholder prices: error/empty → the band hides itself.
 * - PRICE_SLIDER_ENABLED=false (server) → the band never renders.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Pause, Play, X } from "lucide-react";
import { trpc } from "@/providers/trpc";

type SliderItem = {
  id: number;
  product: string;
  grade: string | null;
  basis: string;
  region: string;
  location: string;
  currency: string;
  unit: string;
  value: number;
  changeAbs: number | null;
  changePct: number | null;
  direction: "UP" | "DOWN" | "FLAT";
  sourceCode: string;
  sourceName: string;
  dataAsOf: Date;
  stale: boolean;
};

const FALLBACK_REGIONS = [
  "Middle East", "Black Sea", "Baltic", "North Africa", "North West Europe",
  "US Gulf", "Brazil", "India", "China", "Southeast Asia", "East Africa", "Southern Africa",
];

const ALL = "All";
const LS_REGION = "aq.slider.region";
const LS_PAUSED = "aq.slider.paused";
const STALE_MS = 45 * 864e5;

const fmtPrice = (v: number) =>
  "$" + v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtSigned = (v: number) => (v > 0 ? "+" : "") + v.toFixed(2);
const fmtPct = (v: number) => `(${v > 0 ? "+" : ""}${v.toFixed(2)}%)`;
const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fn = () => setReduced(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

function PriceCard({ item }: { item: SliderItem }) {
  /* Track surface is always dark → use the dark-theme price colours (4.5:1+). */
  const color =
    item.direction === "UP"
      ? "#61D19A"
      : item.direction === "DOWN"
        ? "#F66D67"
        : "rgba(255,255,255,0.6)";
  const arrow = item.direction === "UP" ? "▲" : item.direction === "DOWN" ? "▼" : "▬";
  const dirText = item.direction === "UP" ? "up" : item.direction === "DOWN" ? "down" : "unchanged";
  return (
    <div
      className="aq-slider-card flex h-full w-[240px] shrink-0 flex-col justify-center gap-[3px] px-4 sm:w-[280px]"
      role="group"
      aria-label={`${item.product}${item.grade ? ` ${item.grade}` : ""}, ${item.region}, ${item.basis}: ${fmtPrice(item.value)} per ${item.unit}, ${dirText}${item.changeAbs != null ? ` ${fmtSigned(item.changeAbs)}` : ""}`}
    >
      <span
        className="truncate text-[10px] font-semibold uppercase tracking-[0.08em]"
        style={{ color: "rgba(255,255,255,0.72)" }}
      >
        {item.product}
        {item.grade ? ` · ${item.grade}` : ""}
      </span>
      <span
        className="truncate text-[10px] uppercase tracking-[0.06em]"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        {item.region} · {item.basis}
      </span>
      <span className="tabular-nums" style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>
        {fmtPrice(item.value)}
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 400 }}> /{item.unit}</span>
        {item.changeAbs != null && item.changePct != null && (
          <span className="tabular-nums" style={{ color, fontSize: 11, marginLeft: 8, fontWeight: 500 }}>
            <span aria-hidden="true">{arrow} </span>
            <span className="sr-only">{dirText} </span>
            {fmtSigned(item.changeAbs)} {fmtPct(item.changePct)}
          </span>
        )}
      </span>
    </div>
  );
}

/* Row 3 "View sources" panel, lists every contributing source from the DB. */
function SourcesPanel({ onClose }: { onClose: () => void }) {
  const { data: sources, isLoading } = trpc.prices.sources.useQuery();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("button")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-navy-900/55 p-3 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="price-sources-title"
        className="flex max-h-[80vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-navy-900/10"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 id="price-sources-title" className="text-[15px] font-bold text-navy-900">
            Market data sources
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sources panel"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-navy-900 sm:h-9 sm:w-9"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <p className="text-[13px] text-slate-500">Loading sources…</p>
          ) : (
            <ul className="space-y-3">
              {(sources ?? []).map((s) => (
                <li key={s.code} className="rounded-lg border border-slate-200 p-3">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-navy-700 underline-offset-2 hover:underline"
                  >
                    {s.name} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                  <p className="mt-1 text-[12px] text-slate-500">
                    Data as of {s.dataAsOf ? fmtDate(new Date(s.dataAsOf)) : "N/A"} · {s.refreshCadence.toLowerCase()} refresh
                  </p>
                  {s.attributionText && (
                    <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{s.attributionText}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function PriceSlider() {
  const reducedMotion = useReducedMotion();
  const { data: flagOn, isLoading: flagLoading } = trpc.prices.enabled.useQuery();
  const { data: regionsData } = trpc.prices.regions.useQuery();
  const regions = regionsData ?? FALLBACK_REGIONS;

  const [region, setRegion] = useState<string>(ALL);
  const [displayRegion, setDisplayRegion] = useState<string>(ALL);
  const [fading, setFading] = useState(false);
  const [paused, setPaused] = useState<boolean>(() => localStorage.getItem(LS_PAUSED) === "1");
  const [hoverPause, setHoverPause] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const offsetRef = useRef(0);

  /* Restore persisted region once the real list is known */
  useEffect(() => {
    const saved = localStorage.getItem(LS_REGION);
    const initial = saved && (saved === ALL || regions.includes(saved)) ? saved : ALL;
    setRegion(initial);
    setDisplayRegion(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionsData]);

  const { data, isLoading, isError } = trpc.prices.slider.useQuery(
    { region: displayRegion },
    { refetchInterval: 60_000, retry: 1 }
  );

  /* Region select → 200ms cross-fade, persist */
  const onRegionChange = useCallback((next: string) => {
    setRegion(next);
    localStorage.setItem(LS_REGION, next);
    setFading(true);
    window.setTimeout(() => {
      setDisplayRegion(next);
      setFading(false);
    }, 200);
  }, []);

  const togglePause = useCallback(() => {
    setPaused((p) => {
      localStorage.setItem(LS_PAUSED, p ? "0" : "1");
      return !p;
    });
  }, []);

  /* Seamless transform-only loop (60s per full pass, right to left) */
  const items = useMemo(() => data?.items ?? [], [data]);
  const animated = !reducedMotion && !paused && !hoverPause && items.length > 1;

  useEffect(() => {
    const el = trackRef.current;
    if (!el || !animated) return;
    let last = performance.now();
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      const half = el.scrollWidth / 2;
      if (half > 0) {
        const pxPerMs = half / 60_000;
        offsetRef.current = (offsetRef.current + dt * pxPerMs) % half;
        el.style.transform = `translateX(${-offsetRef.current}px)`;
      }
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [animated, items]);

  useEffect(() => {
    if (!animated && trackRef.current) trackRef.current.style.transform = "translateX(0px)";
    offsetRef.current = 0;
  }, [animated, displayRegion]);

  /* Arrows step one card and pause auto-scroll (spec 3.2) */
  const nudge = useCallback((dir: 1 | -1) => {
    setHoverPause(true);
    const el = trackRef.current;
    if (!el) return;
    const cardW = window.innerWidth >= 640 ? 280 : 240;
    offsetRef.current = Math.max(0, offsetRef.current + dir * cardW);
    el.style.transform = `translateX(${-offsetRef.current}px)`;
  }, []);

  if (flagLoading || !flagOn) return null; // feature flag off → band removed entirely
  if (isError) return null; // total failure → strip hides itself, never placeholders

  const asOf = data?.asOf ? new Date(data.asOf) : null;
  const stale = asOf ? Date.now() - asOf.getTime() > STALE_MS : false;

  return (
    <section
      aria-label="Fertilizer market prices"
      className="aq"
      style={{ borderBottom: "1px solid var(--aq-border-subtle, #e2e8f0)" }}
    >
      {/* Row 1, header + controls */}
      <div
        className="flex min-h-11 flex-wrap items-center gap-2 px-3 py-1.5 sm:gap-3 sm:px-4"
        style={{ background: "var(--aq-surface-sunken, #f1f5f9)" }}
      >
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--aq-text-secondary, #475569)" }}
        >
          Fertilizer market prices
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <label className="sr-only" htmlFor="aq-region-select">Filter prices by region</label>
          <select
            id="aq-region-select"
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
            className="tabular-nums"
            style={{
              height: 32, fontSize: 11, padding: "0 6px",
              background: "var(--aq-surface-raised, #fff)", color: "var(--aq-text-primary, #0f172a)",
              border: "1px solid var(--aq-border-strong, #cbd5e1)", borderRadius: 4,
            }}
          >
            <option value={ALL}>All regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button
            type="button"
            aria-label="Previous prices"
            onClick={() => nudge(-1)}
            className="flex h-11 w-11 items-center justify-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 sm:h-8 sm:w-8"
            style={{ color: "var(--aq-text-secondary, #475569)", border: "1px solid var(--aq-border-subtle, #e2e8f0)", background: "var(--aq-surface-raised, #fff)" }}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next prices"
            onClick={() => nudge(1)}
            className="flex h-11 w-11 items-center justify-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 sm:h-8 sm:w-8"
            style={{ color: "var(--aq-text-secondary, #475569)", border: "1px solid var(--aq-border-subtle, #e2e8f0)", background: "var(--aq-surface-raised, #fff)" }}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
          {!reducedMotion && (
            <button
              type="button"
              aria-label={paused ? "Play price slider" : "Pause price slider"}
              aria-pressed={paused}
              onClick={togglePause}
              className="flex h-11 w-11 items-center justify-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 sm:h-8 sm:w-8"
              style={{ color: "var(--aq-text-secondary, #475569)", border: "1px solid var(--aq-border-subtle, #e2e8f0)", background: "var(--aq-surface-raised, #fff)" }}
            >
              {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
            </button>
          )}
        </div>
      </div>

      {/* Row 2, price track (76px desktop / 68px mobile) */}
      <div
        className="relative h-[68px] overflow-hidden sm:h-[76px]"
        style={{
          background: "var(--aq-surface-dark, #0f2537)",
          opacity: fading ? 0 : 1,
          transition: "opacity 200ms ease",
        }}
        aria-live="off"
        onMouseEnter={() => setHoverPause(true)}
        onMouseLeave={() => setHoverPause(false)}
        onFocusCapture={() => setHoverPause(true)}
        onBlurCapture={() => setHoverPause(false)}
      >
        {isLoading ? (
          <div className="flex h-full items-center" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-[240px] shrink-0 px-4 sm:w-[280px]" style={{ borderRight: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="mb-1.5 h-2 w-24 rounded" style={{ background: "rgba(255,255,255,0.14)" }} />
                <div className="mb-1.5 h-2 w-16 rounded" style={{ background: "rgba(255,255,255,0.08)" }} />
                <div className="h-3 w-32 rounded" style={{ background: "rgba(255,255,255,0.18)" }} />
              </div>
            ))}
            <span className="sr-only">Loading fertilizer prices…</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1">
            <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>
              No current indications for {displayRegion === ALL ? "any region" : displayRegion}
            </span>
            <a
              href="mailto:enquiry@aquifert.com?subject=Price%20coverage%20request"
              className="text-[11px] font-semibold underline-offset-2 hover:underline"
              style={{ color: "#7FB8E0" }}
            >
              Contact the desk for coverage →
            </a>
          </div>
        ) : (
          <div
            className={animated ? "h-full overflow-hidden" : "h-full overflow-x-auto"}
            style={{ scrollbarWidth: "none" }}
          >
            <div
              ref={trackRef}
              className="flex h-full will-change-transform"
              style={{ width: "max-content" }}
            >
              {(animated ? [...items, ...items] : items).map((item, i) => (
                <div key={`${item.id}-${i}`} className="h-full" style={{ borderRight: "1px solid rgba(255,255,255,0.08)" }}>
                  <PriceCard item={item} />
                </div>
              ))}
            </div>
          </div>
        )}
        {(paused || reducedMotion) && !isLoading && items.length > 0 && (
          <span className="sr-only">Auto-scroll paused, use the arrow buttons or swipe to browse prices.</span>
        )}
      </div>

      {/* Row 3, caption */}
      <div
        className="flex items-center justify-center gap-2 px-4 py-2 text-center"
        style={{ background: "var(--aq-surface-sunken, #f1f5f9)" }}
      >
        <p
          className="text-[11px]"
          style={{ color: stale ? "#B45309" : "var(--aq-text-secondary, #475569)" }}
        >
          Latest market data
          {asOf ? ` · Updated ${fmtDate(asOf)}` : ""}
          {stale ? ", awaiting refresh" : ""}
        </p>
        <button
          type="button"
          onClick={() => setShowSources(true)}
          className="text-[11px] font-medium underline-offset-2 hover:underline"
          style={{ color: "var(--aq-text-secondary, #475569)" }}
        >
          View sources
        </button>
      </div>

      {showSources && <SourcesPanel onClose={() => setShowSources(false)} />}

      {/* Visually hidden full data table */}
      {items.length > 0 && (
        <div className="sr-only"><table>
          <caption>
            Fertilizer price indications{displayRegion === ALL ? "" : ` for ${displayRegion}`}
            {asOf ? `, latest data ${fmtDate(asOf)}` : ""}
          </caption>
          <thead>
            <tr><th>Product</th><th>Region</th><th>Basis</th><th>Price</th><th>Change</th><th>Source</th></tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>{i.product}{i.grade ? ` ${i.grade}` : ""}</td>
                <td>{i.region}</td>
                <td>{i.basis} {i.location}</td>
                <td>{fmtPrice(i.value)} per {i.unit}</td>
                <td>{i.changeAbs != null ? `${i.direction === "UP" ? "Up" : i.direction === "DOWN" ? "Down" : "Unchanged"} ${fmtSigned(i.changeAbs)} (${i.changePct?.toFixed(2)}%)` : "n/a"}</td>
                <td>{i.sourceName}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </section>
  );
}
