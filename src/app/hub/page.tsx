import { Info, Radio } from "lucide-react";
import { FreightAnalytics } from "@/components/hub/freight-board";
import { HomeHero } from "@/components/hub/home-hero";
import { Markdown } from "@/components/hub/markdown";
import { PaperForwardBrief } from "@/components/hub/paper-forward";
import { canReadTelex, formatDay, formatStamp, formatTelexDay, telexHeadline } from "@/lib/content-types";
import { getHubContent, sortHedge, sortTelex } from "@/lib/hub-content";
import { getSession } from "@/lib/session";

const ARC = Math.PI * 46;

/** One colour per card, in order: nitrogen green, phosphate orange, potassium red. */
const CARD_COLORS = [
  { color: "#16a34a", soft: "#e9f7ee" },
  { color: "#e8870e", soft: "#fdf1e2" },
  { color: "#dc2626", soft: "#fdecec" },
];

function stance(value: number, index: number) {
  const tone = CARD_COLORS[index % CARD_COLORS.length];
  const label = value > 66 ? "Bullish" : value >= 34 ? "Neutral" : "Bearish";
  return { label, ...tone };
}

function Gauge({ value, color }: { value: number; color: string }) {
  const drawn = (Math.min(100, Math.max(0, value)) / 100) * ARC;
  return (
    <svg className="mx-auto mt-2 w-full max-w-[190px]" viewBox="0 0 120 70" role="img" aria-label={`Score ${value} out of 100`}>
      <path d="M14 62 A 46 46 0 0 1 106 62" fill="none" stroke="#edf1f5" strokeWidth="9" strokeLinecap="round" />
      <path
        d="M14 62 A 46 46 0 0 1 106 62"
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${drawn} ${ARC}`}
        className="aq-gauge-arc"
        style={{ "--aq-arc": drawn } as React.CSSProperties}
      />
      <text x="60" y="58" textAnchor="middle" fill="#10263b" fontSize="24" fontWeight="650" style={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </text>
    </svg>
  );
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSession();
  const content = await getHubContent();
  const { indicators, freight } = content;
  const readingsDay = content.indicatorsUpdatedAt ?? content.updatedAt;
  const plan = user?.plan ?? "core";
  const telex = sortTelex(content.telex).filter((item) => item.status === "published" && canReadTelex(item.access, plan));
  const hedgeReports = sortHedge(content.hedgeReports).filter((item) => item.status === "published");
  return (
    <div className="flex flex-col gap-6 pb-2">
      <div className={`grid grid-cols-1 gap-4 ${hedgeReports.length ? "xl:grid-cols-2" : ""}`}>
        <section aria-labelledby="indicators-title" className="aq-card flex min-w-0 flex-col overflow-hidden xl:h-[500px]">
          <header className="flex shrink-0 items-baseline justify-between gap-4 border-b border-border px-5 py-3.5">
            <h2 id="indicators-title" className="text-[16.5px] font-semibold text-ink">
              Market Indicators
            </h2>
            {readingsDay ? <p className="font-mono text-[12px] uppercase tracking-wide text-dim">{formatDay(readingsDay)}</p> : null}
          </header>
          <div className="aq-stagger grid flex-1 grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {indicators.map((item, index) => {
              const tone = stance(item.value, index);
              return (
                <article key={item.name} className="flex min-w-0 flex-col items-center px-4 pb-5 pt-6 text-center">
                  <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-mid">{item.name}</p>
                  <Gauge value={item.value} color={tone.color} />
                  <span className="mt-2 rounded-full px-2 py-0.5 text-[11.5px] font-bold uppercase tracking-[0.1em]" style={{ color: tone.color, background: tone.soft }}>
                    {tone.label}
                  </span>
                  <p className="mt-4 w-full border-t border-border pt-4 text-[15px] leading-[1.6] text-ink" title={item.note || undefined}>
                    {item.summary}
                  </p>
                </article>
              );
            })}
          </div>
          <p className="shrink-0 border-t border-border bg-s2 px-5 py-2.5 text-center font-mono text-[11.5px] uppercase tracking-wide text-dim">
            Score 0–100 · Bearish &lt;34 · Neutral 34–66 · Bullish &gt;66
          </p>
        </section>

        <PaperForwardBrief reports={hedgeReports} className="xl:h-[500px]" />
      </div>

      <HomeHero name={user?.name ?? ""} />

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="aq-card flex min-w-0 flex-col overflow-hidden lg:h-[640px]">
          <header className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-3.5">
            <span className="aq-chip aq-chip-blue flex h-8 w-8 items-center justify-center rounded-[10px] text-white">
              <Radio className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <h2 className="text-[16.5px] font-semibold text-ink">Telex</h2>
                <span className="text-[13.5px] text-dim">Intel feed</span>
              </div>
              {telex[0] ? <p className="font-mono text-[12px] uppercase tracking-wide text-dim">Updated {formatStamp(telex[0].publishedAt)}</p> : null}
            </div>
          </header>
          <div className="flex shrink-0 items-start gap-2 border-b border-border bg-s2 px-5 py-2.5 text-[13px] leading-relaxed text-mid">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue" />
            <p>
              Preliminary market intel. Verify data before trading.{" "}
              <a href="/hub/account/legal" className="font-medium text-blue underline underline-offset-2">
                More
              </a>
            </p>
          </div>
          <div className="max-h-[70dvh] min-h-0 flex-1 overflow-y-auto lg:max-h-none">
            {telex.length === 0 ? <p className="px-5 py-12 text-center text-sm text-mid">No Telex messages for your plan yet.</p> : null}
            {telex.map((item) => (
              <article key={item.id} className="border-b border-border px-5 py-4 transition-colors last:border-b-0 hover:bg-s2/60">
                <p className="font-mono text-[12px] uppercase tracking-wide text-dim">{formatTelexDay(item.publishedAt)}</p>
                <h3 className="mt-1.5 text-[17px] font-semibold leading-snug tracking-[-0.01em] text-ink">{telexHeadline(item)}</h3>
                <Markdown text={item.paragraphs.join("\n\n")} images className="mt-2.5 text-[15px] text-ink" />
                {item.tags.length ? (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-blue-light px-2 py-0.5 text-[12px] font-semibold text-blue">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </article>

        <article className="aq-card flex min-w-0 flex-col overflow-hidden lg:h-[640px]">
          <header className="shrink-0 border-b border-border px-5 py-3.5">
            <h2 className="text-[16.5px] font-semibold text-ink">Market Analysis</h2>
            {readingsDay ? <p className="font-mono text-[12px] uppercase tracking-wide text-dim">{formatDay(readingsDay)}</p> : null}
          </header>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {indicators.every((item) => !item.note) ? <p className="py-8 text-center text-sm text-mid">No commentary this week.</p> : null}
            {indicators.map((item, index) => {
              if (!item.note) return null;
              const tone = stance(item.value, index);
              return (
                <div key={item.name}>
                  <p className="flex items-center gap-2 font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-mid">
                    <span className="h-2 w-2 rounded-full" style={{ background: tone.color }} />
                    {item.name}
                    <span className="normal-case tracking-normal" style={{ color: tone.color }}>
                      {tone.label}
                    </span>
                  </p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink">{item.note}</p>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      {freight.showOnHome ? <FreightAnalytics fixtures={freight.fixtures.filter((row) => row.visible)} commentary={freight.commentary} /> : null}
    </div>
  );
}
