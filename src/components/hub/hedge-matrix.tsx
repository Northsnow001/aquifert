import { DIRECTION_MARK, hedgePeriods, type CurveDirection, type HedgeSection } from "@/lib/content-types";

const DIR_COLOR: Record<CurveDirection, string> = { up: "text-teal", down: "text-danger", flat: "text-dim" };
const DIR_LABEL: Record<CurveDirection, string> = { up: "Higher", down: "Lower", flat: "Unchanged" };

/** `fit` shares the width evenly between compact columns for half-width cards, scrolling only on phones. */
export function HedgeMatrix({ sections, dense = false, fit = false }: { sections: HedgeSection[]; dense?: boolean; fit?: boolean }) {
  const visible = sections.filter((section) => section.commodities.some((commodity) => commodity.rows.length));
  if (visible.length === 0) {
    return <p className="px-5 py-8 text-center font-mono text-xs text-dim">No priced months in this report yet.</p>;
  }
  const pad = fit ? "px-3" : dense ? "px-3" : "px-5";
  const cell = fit ? "px-1.5 xl:px-0.5" : "px-2";
  const pin = "sticky left-0 z-[1] shadow-[1px_0_0_var(--color-border)]";

  return (
    <div className="divide-y divide-border">
      {visible.map((section) => {
        const periods = hedgePeriods(section);
        return (
          <div key={section.id} className="pb-1">
            <p className={`${pad} pb-2 pt-3.5 text-[12px] font-semibold uppercase tracking-wider text-mid`}>
              {section.label} <span className="font-normal normal-case text-dim">(bid/ask, USD/t)</span>
            </p>
            <div className="overflow-x-auto">
              <table
                className={`w-full border-collapse text-left ${fit ? "min-w-(--roomy) table-fixed xl:min-w-(--snug)" : "min-w-(--roomy)"}`}
                style={
                  {
                    "--roomy": `${fit ? 72 + section.commodities.length * 92 : 120 + section.commodities.length * (dense ? 118 : 136)}px`,
                    "--snug": `${72 + section.commodities.length * 70}px`,
                  } as React.CSSProperties
                }
              >
                <thead>
                  <tr className="border-y border-border bg-s3">
                    <th className={`${pin} bg-s3 ${pad} ${fit ? "w-[72px]" : "w-[96px]"} py-2 align-bottom font-mono text-[11.5px] font-medium uppercase tracking-wide text-dim`}>Month</th>
                    {section.commodities.map((commodity) => (
                      <th key={commodity.id} className={`${cell} py-2 text-center align-bottom`}>
                        <span className={`block font-mono font-semibold leading-tight text-mid ${fit ? "text-[11.5px]" : "text-[12px]"}`}>{commodity.label}</span>
                        {commodity.index ? <span className="mt-0.5 block font-mono text-[11px] font-normal text-dim">{commodity.index}</span> : null}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`font-mono ${fit ? "text-[12px]" : "text-[13px]"}`}>
                  {periods.map((period) => (
                    <tr key={period.key} className="border-b border-border last:border-b-0 hover:bg-blue/[.03]">
                      <td className={`${pin} bg-white ${pad} py-2 text-mid [overflow-wrap:anywhere]`}>{period.label}</td>
                      {section.commodities.map((commodity) => {
                        const row = commodity.rows.find((item) => item.period.trim().toLowerCase() === period.key);
                        if (!row || (!row.bid && !row.ask)) {
                          return (
                            <td key={commodity.id} className={`${cell} py-2 text-center text-dim`}>
                              –
                            </td>
                          );
                        }
                        const value = row.bid && row.ask ? `${row.bid}/${row.ask}` : row.bid || row.ask;
                        return (
                          <td key={commodity.id} className={`whitespace-nowrap ${cell} py-2 text-center font-semibold text-ink`}>
                            {value}
                            <span className={`${fit ? "ml-0.5" : "ml-1"} ${DIR_COLOR[row.dir]}`} title={DIR_LABEL[row.dir]}>
                              {DIRECTION_MARK[row.dir]}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
