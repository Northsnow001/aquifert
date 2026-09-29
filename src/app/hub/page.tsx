import { Info } from "lucide-react";
import { freightCommentary, freightEnquiries, indicators, telex } from "@/data/sample";

const GAUGE_COLORS = ["#16a34a", "#d97706", "#dc2626"];

function Gauge({ value, color }: { value: number; color: string }) {
  const length = (value / 100) * 75.4;
  return (
    <svg className="mx-auto h-16 w-24" viewBox="0 0 56 36">
      <path d="M4 30 A 24 24 0 0 1 52 30" fill="none" stroke="#e6edf2" strokeWidth="5" strokeLinecap="round" />
      <path
        d="M4 30 A 24 24 0 0 1 52 30"
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${length} 75.4`}
      />
      <text x="28" y="28" textAnchor="middle" fill="#1a3a5c" fontSize="11" fontWeight="700">
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
    <div className="flex flex-col gap-5">
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-baseline gap-1.5">
                <h2 className="text-sm font-bold uppercase tracking-wider">Telex</h2>
                <span className="text-xs text-mid">Intel Feed</span>
              </div>
              <p className="mt-0.5 font-mono text-xs uppercase tracking-wide text-mid">Updated 28 Sep 2026 2:58 AM</p>
            </div>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="flex items-start gap-2 border-b border-border bg-s3/40 px-4 py-2.5 text-[11.5px] leading-relaxed text-mid">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue" />
              <p>
                Preliminary market intel. Verify data before trading.{" "}
                <a href="/hub/account/legal" className="text-blue underline underline-offset-2">
                  More
                </a>
              </p>
            </div>
            <div>
              {telex.map((item) => (
                <article key={item.id} className="border-b border-border px-5 py-4 last:border-b-0">
                  <p className="font-mono text-[11px] uppercase tracking-wide text-dim">{item.date}</p>
                  <h3 className="mt-2 text-[15px] font-bold uppercase leading-snug tracking-wide">{item.title}</h3>
                  <div className="mt-3 space-y-3 text-[13.5px] leading-relaxed text-ink">
                    {item.paragraphs.map((paragraph) => (
                      <p key={paragraph.slice(0, 24)}>{paragraph}</p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <h2 className="text-sm font-bold">Market Indicators</h2>
            <p className="font-mono text-[11px] uppercase tracking-wide text-mid">29 Sep 2026</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {indicators.map((item, index) => {
              const color = GAUGE_COLORS[index] ?? "#2e6da4";
              return (
                <div key={item.name} className="rounded-xl border border-border bg-surface px-2 py-4 text-center">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-mid">{item.name}</p>
                  <Gauge value={item.value} color={color} />
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color }}>
                    {stance(item.value)}
                  </p>
                </div>
              );
            })}
          </div>
          <section className="rounded-xl border border-border bg-surface p-4">
            <h3 className="text-sm font-semibold">Commentary</h3>
            <div className="mt-3 space-y-3 text-[13.5px] leading-relaxed text-ink">
              {indicators.map((item) => (
                <p key={item.name}>{item.note}</p>
              ))}
            </div>
          </section>
        </div>
      </div>

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
    </div>
  );
}
