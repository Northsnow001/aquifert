"use client";

import { useMemo, useRef, useState, type MouseEvent } from "react";
import markers from "@/data/tools-markers.json";
import { GLOSSARY, HOW_IT_IS_MADE, PHOSPHATE_CURVE, ureaCurve } from "@/lib/tools/academy";
import { ammoniaCost, productCosts } from "@/lib/tools/costs";
import {
  COUNTRY_SHAPES,
  factNameForCountry,
  MAP_HEIGHT,
  MAP_WIDTH,
  projectPoint,
  UREA_EXPORTER_IDS,
} from "@/lib/tools/world-map";

type Tab = "map" | "calc" | "how" | "glossary";
type Layer = "nh3" | "urea" | "phos" | "mop";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "map", label: "World Map" },
  { id: "calc", label: "Cost Calculator" },
  { id: "how", label: "How It's Made" },
  { id: "glossary", label: "Glossary" },
];

const LAYERS: Array<{ id: Layer; label: string; dot: string }> = [
  { id: "nh3", label: "NH₃ Terminals", dot: "bg-[#2e6da4]" },
  { id: "urea", label: "Urea Exporters", dot: "bg-[#6baa8e]" },
  { id: "phos", label: "Phosphate Producers", dot: "bg-[#d97706]" },
  { id: "mop", label: "MOP / Potash Mines", dot: "bg-[#dc2626]" },
];

export function ToolsBoard({ commentaryHtml }: { commentaryHtml: string }) {
  const [tab, setTab] = useState<Tab>("map");
  const [layers, setLayers] = useState<Record<Layer, boolean>>({
    nh3: true,
    urea: true,
    phos: true,
    mop: true,
  });
  const [gas, setGas] = useState(7);
  const [rock, setRock] = useState(175);
  const [sulphur, setSulphur] = useState(165);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [factName, setFactName] = useState<string | null>(null);
  const [phosphate, setPhosphate] = useState<(typeof PHOSPHATE_CURVE)[number] | null>(null);

  const products = useMemo(() => productCosts({ gas, rock, sulphur }), [gas, rock, sulphur]);
  const selected = products.find((product) => product.id === selectedId) ?? null;
  const urea = useMemo(() => ureaCurve(), []);
  const ammonia = Math.round(ammoniaCost(gas));
  const fact = markers.facts.find((item) => item.n === factName) ?? null;

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">Tools</h1>
        <span className="rounded-full border border-border bg-s2 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-mid">
          Beta
        </span>
      </div>

      <div className="flex items-end border-b border-border">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`border-b-2 px-4 py-2.5 text-xs font-medium ${
              tab === item.id ? "border-blue text-blue" : "border-transparent text-mid hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
        <span className="mb-2.5 ml-auto hidden text-[10px] text-dim md:block">Global fertilizer trade · interactive guide</span>
      </div>

      {tab === "map" ? (
        <MapTab
          layers={layers}
          urea={urea}
          phosphate={phosphate}
          fact={fact}
          onToggle={(id) => setLayers((current) => ({ ...current, [id]: !current[id] }))}
          onPhosphate={setPhosphate}
          onFact={setFactName}
        />
      ) : null}

      {tab === "calc" ? (
        <section className="space-y-4">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-mid">
            Adjust feedstock prices — all costs update instantly
          </p>
          <div className="grid gap-3 lg:grid-cols-3">
            <Slider
              label="Natural gas — drives NH₃ & all N costs"
              min={2}
              max={25}
              step={0.5}
              value={gas}
              display={gas.toFixed(1)}
              unit="USD/MMBtu"
              onChange={setGas}
            />
            <Slider
              label="Phosphate rock (63% BPL)"
              min={60}
              max={350}
              step={5}
              value={rock}
              display={String(rock)}
              unit="USD/t CFR"
              onChange={setRock}
            />
            <Slider
              label="Sulphur"
              min={0}
              max={1000}
              step={5}
              value={sulphur}
              display={String(sulphur)}
              unit="USD/t FOB"
              onChange={setSulphur}
            />
          </div>
          <div className="rounded-lg bg-[#1a4a6e] px-4 py-3 text-sm text-white">
            <span>NH₃ production cost (33 MMBtu/t × gas + USD 30): </span>
            <strong>USD {ammonia}/t</strong>
            <em className="ml-2 text-white/80">— basis for all downstream N product costs</em>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {products.map((product) => {
              const active = product.id === selectedId;
              const width = Math.min((product.cost / product.scale) * 100, 100);
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setSelectedId(active ? null : product.id)}
                  className="rounded-xl border bg-surface px-3 py-3 text-left"
                  style={{ borderColor: active ? product.color : "#dce4ea" }}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-mid">{product.name}</p>
                  <p className="mt-2 font-mono text-2xl font-semibold text-ink">USD {product.cost}</p>
                  <p className="text-xs text-dim">per tonne</p>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-s3">
                    <div className="h-full rounded-full" style={{ width: `${width}%`, background: product.color }} />
                  </div>
                </button>
              );
            })}
          </div>
          {selected ? (
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="mb-3 text-sm font-semibold" style={{ color: selected.color }}>
                {selected.name} — cost breakdown
              </p>
              <div className="divide-y divide-s3">
                {selected.lines.map((line) => (
                  <div key={line.label} className="flex items-center justify-between gap-4 py-2 text-sm">
                    <span className="text-mid">{line.label}</span>
                    <span className={line.total ? "font-mono text-base font-bold" : "font-mono text-ink"} style={line.total ? { color: selected.color } : undefined}>
                      {line.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "how" ? (
        <section>
          <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-mid">
            Production chains — from raw material to finished fertilizer
          </p>
          <div className="grid gap-3 lg:grid-cols-3">
            {HOW_IT_IS_MADE.map((item) => (
              <article key={item.name} className="rounded-xl border border-border bg-surface p-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                  {item.name}
                </h2>
                <ol className="mt-3 list-decimal space-y-1 pl-4 text-[13px] leading-relaxed text-mid">
                  {item.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p className="mt-3 text-xs leading-relaxed text-dim">{item.note}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "glossary" ? (
        <section>
          <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-mid">Key terms explained</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {GLOSSARY.map(([term, definition]) => (
              <article key={term} className="rounded-xl border border-border bg-surface p-3">
                <h2 className="text-sm font-semibold text-ink">{term}</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-mid">{definition}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <Commentary html={commentaryHtml} />
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  display,
  unit,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  display: string;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="rounded-xl border border-border bg-surface px-3 py-3">
      <span className="block text-xs font-medium text-mid">{label}</span>
      <span className="mt-2 flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full accent-[#2e6da4]"
        />
        <span className="w-12 text-right font-mono text-lg font-semibold text-ink">{display}</span>
        <span className="w-24 text-[11px] text-dim">{unit}</span>
      </span>
    </label>
  );
}

function MapTab({
  layers,
  urea,
  phosphate,
  fact,
  onToggle,
  onPhosphate,
  onFact,
}: {
  layers: Record<Layer, boolean>;
  urea: ReturnType<typeof ureaCurve>;
  phosphate: (typeof PHOSPHATE_CURVE)[number] | null;
  fact: { n: string; f: string; t: string[] } | null;
  onToggle: (id: Layer) => void;
  onPhosphate: (row: (typeof PHOSPHATE_CURVE)[number] | null) => void;
  onFact: (name: string) => void;
}) {
  const width = 900;
  const height = 340;
  const left = 54;
  const top = 28;
  const plotW = width - left - 8;
  const plotH = height - top - 96;
  const capacity = PHOSPHATE_CURVE.reduce((sum, row) => sum + row.cap, 0);
  const offsets = PHOSPHATE_CURVE.map((_, index) => PHOSPHATE_CURVE.slice(0, index).reduce((sum, row) => sum + (row.cap / capacity) * plotW, 0));

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {LAYERS.map((layer) => (
          <button
            key={layer.id}
            type="button"
            onClick={() => onToggle(layer.id)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium ${
              layers[layer.id] ? "border-blue bg-blue-light text-ink" : "border-border bg-surface text-mid"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${layer.dot}`} />
            {layer.label}
          </button>
        ))}
      </div>

      {layers.urea ? <UreaChart rows={urea} /> : null}
      {layers.phos ? (
        <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface p-3">
          <h2 className="text-sm font-semibold text-ink">Phosphate Rock Ex-Works Cost Curve — Global Producers (2019 basis)</h2>
          <p className="text-xs text-dim">USD/t — Mining + Beneficiation ordered by cumulative capacity (mn t). Click any bar to reveal country.</p>
          <div className="mt-2 min-w-0 overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full min-w-[560px]" overflow="hidden" role="img" aria-label="Phosphate rock cost curve">
            {[0, 25, 50, 75, 100, 125, 150, 175].map((tick) => {
              const y = top + plotH - (tick / 180) * plotH;
              return (
                <g key={tick}>
                  <line x1={left} x2={left + plotW} y1={y} y2={y} stroke="rgba(26,58,92,0.08)" />
                  <text x={left - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#8faab8">{tick}</text>
                </g>
              );
            })}
            {PHOSPHATE_CURVE.map((row, index) => {
              const barW = Math.max((row.cap / capacity) * plotW - 1, 1);
              const x = left + offsets[index];
              const mineH = (row.mine / 180) * plotH;
              const benH = (row.ben / 180) * plotH;
              const base = top + plotH;
              return (
                <g key={row.label} onClick={() => onPhosphate(row)} className="cursor-pointer">
                  <rect x={x} y={base - mineH} width={barW} height={mineH} fill="#1a3a5c" />
                  <rect x={x} y={base - mineH - benH} width={barW} height={benH} fill="#6baa8e" />
                  {barW > 14 ? (
                    <text transform={`translate(${x + barW / 2}, ${base + 10}) rotate(-60)`} textAnchor="end" fontSize="9" fill="#1a3a5c">
                      {row.label}
                    </text>
                  ) : null}
                </g>
              );
            })}
            <text x={14} y={height / 2} transform={`rotate(-90 14 ${height / 2})`} textAnchor="middle" fontSize="10" fill="#8faab8">
              USD/t ex-works
            </text>
          </svg>
          </div>
          {phosphate ? (
            <p className="mt-2 rounded-lg bg-s2 px-3 py-2 text-sm text-ink">
              <strong>{phosphate.label}</strong>
              {` · Mining USD ${phosphate.mine}/t · Beneficiation USD ${phosphate.ben}/t · Total ex-works USD ${phosphate.mine + phosphate.ben}/t · Capacity ${phosphate.cap} mn t/yr`}
            </p>
          ) : null}
        </section>
      ) : null}

      <WorldMap
        layers={layers}
        onCountry={(name) => {
          const factName = factNameForCountry(name);
          if (markers.facts.some((item) => item.n === factName)) onFact(factName);
        }}
      />

      {layers.urea ? (
        <div className="flex flex-wrap gap-1.5">
          {markers.facts.map((item) => (
            <button
              key={item.n}
              type="button"
              onClick={() => onFact(item.n)}
              className={`rounded-full border px-2.5 py-1 text-[11px] ${
                fact?.n === item.n ? "border-blue bg-blue-light text-ink" : "border-border bg-surface text-mid"
              }`}
            >
              {item.n}
            </button>
          ))}
        </div>
      ) : null}
      {fact ? (
        <article className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-base font-semibold text-ink">{fact.n}</h2>
          <p className="mt-2 text-sm leading-relaxed text-mid">{fact.f}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {fact.t.map((tag) => (
              <span key={tag} className="rounded-full bg-s2 px-2 py-0.5 text-[11px] text-mid">{tag}</span>
            ))}
          </div>
        </article>
      ) : null}
    </div>
  );
}

function UreaChart({ rows }: { rows: ReturnType<typeof ureaCurve> }) {
  const width = 900;
  const height = 310;
  const left = 52;
  const top = 30;
  const plotW = width - left - 8;
  const plotH = height - top - 110;
  const band = plotW / rows.length;
  const barW = band * 0.72;
  const colors = ["#1a3a5c", "#6baa8e", "#a3cdba", "#d5e6df"];

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface p-3">
      <h2 className="text-sm font-semibold text-ink">Urea Export Cost Curve — Key Origins (FOB/FCA basis, 2025 estimates)</h2>
      <p className="text-xs text-dim">USD/t — Feedstock · Other Variable · Fixed · Cost-to-FOB stacked, sorted lowest to highest.</p>
      <div className="mt-2 min-w-0 overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full min-w-[680px]" overflow="hidden" role="img" aria-label="Urea export cost curve">
        {["Feedstock", "Other Variable", "Fixed", "Cost to FOB"].map((label, index) => (
          <g key={label} transform={`translate(${left + index * 125}, 8)`}>
            <rect width="10" height="10" rx="1" fill={colors[index]} />
            <text x="14" y="9" fontSize="10" fill="#8faab8">{label}</text>
          </g>
        ))}
        {[0, 50, 100, 150, 200, 250, 300, 350].map((tick) => {
          const y = top + plotH - (tick / 350) * plotH;
          return (
            <g key={tick}>
              <line x1={left} x2={left + plotW} y1={y} y2={y} stroke="rgba(26,58,92,0.08)" />
              <text x={left - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#8faab8">{tick}</text>
            </g>
          );
        })}
        {rows.map((row, index) => {
          const x = left + index * band + (band - barW) / 2;
          const parts = [row.feedstock, row.variable, row.fixed, row.fob];
          let stacked = 0;
          return (
            <g key={row.label}>
              {parts.map((part, partIndex) => {
                if (part <= 0) return null;
                const h = (part / 350) * plotH;
                const y = top + plotH - ((stacked + part) / 350) * plotH;
                stacked += part;
                return <rect key={partIndex} x={x} y={y} width={barW} height={h} fill={colors[partIndex]} />;
              })}
              <text x={x + barW / 2} y={top + plotH - (row.total / 350) * plotH - 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="#1a3a5c">
                {row.total}
              </text>
              <text transform={`translate(${x + barW / 2}, ${top + plotH + 12}) rotate(-60)`} textAnchor="end" fontSize="10" fill="#1a3a5c">
                {row.label}
              </text>
            </g>
          );
        })}
      </svg>
      </div>
    </section>
  );
}

function WorldMap({
  layers,
  onCountry,
}: {
  layers: Record<Layer, boolean>;
  onCountry: (name: string) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  function showTip(event: MouseEvent, text: string) {
    const frame = frameRef.current;
    const tip = tipRef.current;
    if (!frame || !tip) return;
    const rect = frame.getBoundingClientRect();
    tip.hidden = false;
    tip.textContent = text;
    const tipWidth = tip.offsetWidth;
    const tipHeight = tip.offsetHeight;
    const left = Math.min(Math.max(8, event.clientX - rect.left + 12), Math.max(8, rect.width - tipWidth - 8));
    const top = Math.max(8, event.clientY - rect.top - tipHeight - 8);
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  function hideTip() {
    if (tipRef.current) tipRef.current.hidden = true;
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface">
      <div ref={frameRef} className="relative" onMouseLeave={hideTip}>
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="block h-auto w-full"
          role="img"
          aria-label="Fertilizer trade map"
        >
          <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#dce4ea" onMouseMove={hideTip} />
          {COUNTRY_SHAPES.map((country) => (
            <path
              key={country.name}
              d={country.d}
              data-name={country.name}
              fill={layers.urea && UREA_EXPORTER_IDS.has(country.id) ? "#d5e6df" : "#f4f7f8"}
              stroke="#b7c5ce"
              strokeWidth={0.6}
              className="cursor-pointer"
              onMouseMove={(event) => showTip(event, country.name)}
              onClick={() => onCountry(country.name)}
            />
          ))}
          {layers.mop
            ? markers.mop.map((point) => {
                const projected = projectPoint(point.lon, point.lat);
                if (!projected) return null;
                return (
                  <circle
                    key={point.name}
                    cx={projected.x}
                    cy={projected.y}
                    r={5.5}
                    fill="#dc2626"
                    fillOpacity={0.9}
                    stroke="#fff"
                    strokeWidth={1.2}
                    className="cursor-pointer"
                    onMouseMove={(event) => showTip(event, `MOP mine: ${point.name}`)}
                  />
                );
              })
            : null}
          {layers.phos
            ? markers.phos.map((point) => {
                const projected = projectPoint(point.lon, point.lat);
                if (!projected) return null;
                return (
                  <rect
                    key={point.name}
                    x={projected.x - 5}
                    y={projected.y - 5}
                    width={10}
                    height={10}
                    rx={2}
                    fill="#d97706"
                    fillOpacity={0.92}
                    stroke="#fff"
                    strokeWidth={1.2}
                    className="cursor-pointer"
                    onMouseMove={(event) => showTip(event, `Phosphate: ${point.name}`)}
                  />
                );
              })
            : null}
          {layers.nh3
            ? markers.nh3.map((point, index) => {
                const projected = projectPoint(point.lon, point.lat);
                if (!projected) return null;
                const { x, y } = projected;
                const label = `NH₃ terminal: ${point.name}${point.cap && point.cap !== "na" ? ` (${point.cap})` : ""}`;
                return (
                  <polygon
                    key={`${point.name}-${index}`}
                    points={`${x},${y - 7} ${x + 5},${y + 4} ${x - 5},${y + 4}`}
                    fill="#2e6da4"
                    fillOpacity={0.9}
                    stroke="#fff"
                    strokeWidth={1}
                    className="cursor-pointer"
                    onMouseMove={(event) => showTip(event, label)}
                  />
                );
              })
            : null}
        </svg>
        <div
          ref={tipRef}
          hidden
          className="pointer-events-none absolute z-10 max-w-[220px] rounded-lg bg-[#1a3a5c] px-2.5 py-1.5 text-[11px] leading-snug text-white shadow-lg"
        />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-border px-4 py-2.5 text-[11px] text-mid">
        <span className="inline-flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
            <polygon points="6,1 11,11 1,11" fill="#2e6da4" />
          </svg>
          NH₃ Terminals
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px] border-[1.5px] border-[#559278] bg-[#d5e6df]" />
          Urea Exporters (top 11)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#d97706]" />
          Phosphate Producers
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#dc2626]" />
          MOP / Potash Mines
        </span>
      </div>
    </section>
  );
}

function Commentary({ html }: { html: string }) {
  const blank = !/<(img|table|iframe)\b/i.test(html) && !html.replace(/<[^>]*>/g, "").replace(/&nbsp;|\s/g, "");
  if (blank) return null;
  return (
    <article className="min-w-0 rounded-xl border border-border bg-surface p-4 sm:p-5">
      <p className="text-[13px] font-semibold text-ink">Commentary</p>
      <div className="aq-prose mt-3" dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}
