import { Info } from "lucide-react";
import { PaperForwardBrief } from "@/components/hub/paper-forward";
import { indicators, telex } from "@/data/sample";
// import { freightCommentary, freightEnquiries } from "@/data/sample";

const GAUGE_COLORS = ["#16a34a", "#d97706", "#dc2626"];
const ARC = Math.PI * 46;

function Gauge({ value, color }: { value: number; color: string }) {
  const drawn = (value / 100) * ARC;
  return (
    <svg className="mx-auto h-16 w-full max-w-[180px]" viewBox="0 0 120 74" aria-hidden>
      <path d="M14 64 A 46 46 0 0 1 106 64" fill="none" stroke="#e7eef3" strokeWidth="8" strokeLinecap="round" />
      <path
        d="M14 64 A 46 46 0 0 1 106 64"
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${drawn} ${ARC}`}
      />
      <text x="60" y="58" textAnchor="middle" fill="#1a3a5c" fontSize="22" fontWeight="700">
        {value}
      </text>
    </svg>
  );
}

function stance(value: number) {
  if (value > 66) return "Bullish";
  if (value >= 34) return "Neutral";
  return "Bearish";
}

export default function HomePage() {
  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className="flex shrink-0 flex-col gap-4">
      <section className="flex h-[calc((100dvh-7.5rem)*0.35)] min-h-[13.5rem] flex-col">
        <div className="mb-2 flex shrink-0 items-baseline justify-between gap-4">
          <h2 className="text-sm font-bold tracking-tight text-ink">Market Indicators</h2>
          <p className="font-mono text-[11px] uppercase tracking-wide text-mid">29 Sep 2026</p>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-3">
          {indicators.map((item, index) => {
            const color = GAUGE_COLORS[index] ?? "#2e6da4";
            return (
              <article key={item.name} className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden">
                  <p className="text-center font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-mid">{item.name}</p>
                  <Gauge value={item.value} color={color} />
                  <p className="text-center text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color }}>
                    {stance(item.value)}
                  </p>
                </div>
                <p className="group relative mt-2 shrink-0 border-t border-border pt-2 text-[13px] leading-5 text-ink">
                  <span className="line-clamp-2">{item.summary}</span>
                  <span className="pointer-events-none absolute bottom-[calc(100%+6px)] left-0 z-20 hidden w-full rounded-lg bg-ink px-3 py-2 text-xs leading-relaxed text-white shadow-lg group-hover:block">
                    {item.note}
                  </span>
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid h-[calc((100dvh-7.5rem)*0.75)] min-h-[24rem] grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="flex min-h-[280px] min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm lg:min-h-0">
          <header className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-3.5">
            <div>
              <div className="flex items-baseline gap-1.5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-ink">Telex</h2>
                <span className="text-xs text-mid">Intel Feed</span>
              </div>
              <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-mid">Updated 28 Sep 2026 2:58 AM</p>
            </div>
          </header>
          <div className="flex shrink-0 items-start gap-2 border-b border-border bg-s3/40 px-5 py-2.5 text-[11.5px] leading-relaxed text-mid">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue" />
            <p>
              Preliminary market intel. Verify data before trading.{" "}
              <a href="/hub/account/legal" className="text-blue underline underline-offset-2">
                More
              </a>
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {telex.map((item) => (
              <article key={item.id} className="border-b border-border px-5 py-4 last:border-b-0">
                <p className="font-mono text-[11px] uppercase tracking-wide text-dim">{item.date}</p>
                <h3 className="mt-2 text-[15px] font-bold uppercase leading-snug tracking-wide text-ink">{item.title}</h3>
                <div className="mt-3 space-y-3 text-[13.5px] leading-relaxed text-ink">
                  {item.paragraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 24)}>{paragraph}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="flex min-h-[280px] min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm lg:min-h-0">
          <header className="shrink-0 border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-bold text-ink">Commentary</h2>
            <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-mid">29 Sep 2026</p>
          </header>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {indicators.map((item, index) => {
              const color = GAUGE_COLORS[index] ?? "#2e6da4";
              return (
                <div key={item.name}>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color }}>
                    {item.name}
                  </p>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink">{item.note}</p>
                </div>
              );
            })}
          </div>
        </article>
      </section>
      </div>

      <PaperForwardBrief />

      {/*
      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-3.5">
          <h3 className="text-sm font-bold">Freight Analytics - Open Freight Enquiries</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border bg-s2">
                {["Account", "Product", "Qty (Mts)", "Origin", "Destination", "Laycan"].map((heading) => (
                  <th key={heading} className="px-4 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-wider text-mid">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {freightEnquiries.map((row) => (
                <tr key={`${row.origin}-${row.qty}`} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 font-semibold">{row.account}</td>
                  <td className="px-4 py-3 uppercase">{row.product}</td>
                  <td className="px-4 py-3 font-mono">{row.qty}</td>
                  <td className="px-4 py-3">{row.origin}</td>
                  <td className="px-4 py-3">{row.destination}</td>
                  <td className="px-4 py-3">{row.laycan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface px-5 py-4">
        <h3 className="text-sm font-semibold">Freight Analytics Commentary</h3>
        <h4 className="mt-3 text-[13px] font-bold uppercase tracking-wide">{freightCommentary.title}</h4>
        <div className="mt-3 space-y-3 text-[13.5px] leading-relaxed text-ink">
          {freightCommentary.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 32)}>{paragraph}</p>
          ))}
        </div>
      </section>
      */}
    </div>
  );
}
