import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { formatDay, hedgePeriods, splitParagraphs, type CurveDirection, type HedgeReport, type HedgeRow, type HedgeSection } from "@/lib/content-types";

const UREA_FIRST = (a: HedgeSection, b: HedgeSection) => Number(/urea/i.test(b.label)) - Number(/urea/i.test(a.label));

const DIRECTION: Record<CurveDirection, { label: string; Icon: typeof ArrowRight; tone: string }> = {
  up: { label: "Higher", Icon: ArrowUpRight, tone: "bg-teal/10 text-teal" },
  down: { label: "Lower", Icon: ArrowDownRight, tone: "bg-danger/10 text-danger" },
  flat: { label: "Unchanged", Icon: ArrowRight, tone: "bg-s3 text-dim" },
};

/** Every month any section prices, in the order the desk first lists them, so all sections share one set of columns. */
function curvePeriods(sections: HedgeSection[]) {
  const seen = new Map<string, string>();
  for (const section of sections) for (const period of hedgePeriods(section)) if (!seen.has(period.key)) seen.set(period.key, period.label);
  return Array.from(seen, ([key, label]) => ({ key, label }));
}

/** The editor stores "Index 405"; the column header already says Index. */
const indexValue = (raw: string) => raw.replace(/^\s*(latest\s+)?index(\s+value)?\s*:?\s*/i, "").trim();

function DirectionMark({ dir }: { dir: CurveDirection }) {
  const { label, Icon, tone } = DIRECTION[dir];
  return (
    <span title={label} className={`ml-1.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full align-middle ${tone}`}>
      <Icon className="h-3 w-3" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

function Quote({ row }: { row?: HedgeRow }) {
  if (!row || (!row.bid && !row.ask)) return <span className="text-dim">–</span>;
  return (
    <span className="inline-flex items-center justify-end whitespace-nowrap">
      {row.bid && row.ask ? (
        <>
          <span className="font-semibold text-ink">{row.bid}</span>
          <span className="mx-1 text-dim">/</span>
          <span className="font-semibold text-ink">{row.ask}</span>
        </>
      ) : (
        <span className="font-semibold text-ink">{row.bid || row.ask}</span>
      )}
      <DirectionMark dir={row.dir} />
    </span>
  );
}

function CurveTable({ sections }: { sections: HedgeSection[] }) {
  const periods = curvePeriods(sections);
  const span = periods.length + 2;
  const pin = "sticky left-0 z-[1] bg-white";
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-separate border-spacing-0 text-[13px]" style={{ minWidth: 260 + periods.length * 120 }}>
        <thead>
          <tr className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/85 *:bg-navy-800">
            <th scope="col" className="sticky left-0 z-[1] bg-navy-800 px-4 py-2.5 text-left">
              Benchmark
            </th>
            <th scope="col" className="px-3 py-2.5 text-right">
              Index
            </th>
            {periods.map((period) => (
              <th key={period.key} scope="col" className="px-4 py-2.5 text-right">
                {period.label}
              </th>
            ))}
          </tr>
        </thead>
        {sections.map((section) => (
          <tbody key={section.id}>
            <tr>
              <th scope="rowgroup" colSpan={span} className="border-t border-border bg-s2 px-4 py-2 text-left">
                <span className="sticky left-4 text-[11px] font-bold uppercase tracking-[0.14em] text-navy-700">{section.label}</span>
              </th>
            </tr>
            {section.commodities
              .filter((commodity) => commodity.rows.length)
              .map((commodity) => (
                <tr key={commodity.id} className="*:border-t *:border-border">
                  <th scope="row" className={`${pin} px-4 py-3 text-left text-[13.5px] font-semibold text-ink`}>
                    {commodity.label}
                  </th>
                  <td className="px-3 py-3 text-right font-mono tabular-nums text-mid">{indexValue(commodity.index) || <span className="text-dim">–</span>}</td>
                  {periods.map((period) => (
                    <td key={period.key} className="px-4 py-3 text-right font-mono tabular-nums">
                      <Quote row={commodity.rows.find((row) => row.period.trim().toLowerCase() === period.key)} />
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-dim">
      <span>Bid / ask in USD per tonne. Index is the latest physical assessment.</span>
      {(Object.keys(DIRECTION) as CurveDirection[]).map((dir) => {
        const { label, Icon, tone } = DIRECTION[dir];
        return (
          <span key={dir} className="inline-flex items-center gap-1.5">
            <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full ${tone}`}>
              <Icon className="h-2.5 w-2.5" aria-hidden />
            </span>
            {label}
          </span>
        );
      })}
    </div>
  );
}

/** The latest published Direct Hedge report on the hub: one forward-curve board plus the desk's read of it. */
export function PaperForwardBrief({ reports, className = "" }: { reports: HedgeReport[]; className?: string }) {
  const report = reports[0];
  if (!report) return null;
  const [lead, ...rest] = splitParagraphs(report.narrative);
  const sections = report.sections.filter((section) => section.commodities.some((commodity) => commodity.rows.length)).sort(UREA_FIRST);

  return (
    <section aria-labelledby="hedge-title" className={`aq-card min-w-0 overflow-hidden ${className}`}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div className="min-w-0">
          <h2 id="hedge-title" className="text-[19px] font-extrabold uppercase leading-none tracking-[0.12em] text-navy-800">
            Direct Hedge
          </h2>
          <p className="mt-1.5 text-[12.5px] font-medium leading-tight text-mid">Paper forward curves</p>
        </div>
        <span className="rounded-full border border-border bg-s2 px-3 py-1 text-[12px] font-semibold text-navy-700">Report of {formatDay(report.date)}</span>
      </header>

      <div className={`grid grid-cols-1 ${lead ? "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]" : ""}`}>
        <div className="min-w-0 p-4 sm:p-5">
          {sections.length ? (
            <>
              <CurveTable sections={sections} />
              <Legend />
            </>
          ) : (
            <p className="py-8 text-center text-[13px] text-dim">No priced months in this report yet.</p>
          )}
        </div>

        {lead ? (
          <aside aria-label="Desk commentary" className="border-t border-border bg-s2/50 px-5 py-5 lg:border-l lg:border-t-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-navy-700">Desk commentary</p>
            <p className="mt-3 border-l-[3px] border-navy-700 pl-3 text-[15.5px] font-semibold leading-snug text-ink">{lead}</p>
            {rest.length ? (
              <div className="mt-4 space-y-3 text-[14px] leading-relaxed text-mid">
                {rest.map((paragraph, i) => (
                  <p key={i} className="whitespace-pre-line">
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
    </section>
  );
}
