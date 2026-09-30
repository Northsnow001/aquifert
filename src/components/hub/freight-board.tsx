import { Fragment } from "react";
import { splitParagraphs, type FreightFixture } from "@/lib/content-types";

const COLUMNS = ["Account", "Product", "Qty (Mts)", "Origin", "Destination", "Laycan"];

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^\*\*[^*]+\*\*$/.test(part) ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  );
}

export function FreightTable({ fixtures, compact = false }: { fixtures: FreightFixture[]; compact?: boolean }) {
  const cell = compact ? "px-3 py-2" : "px-4 py-3";
  return (
    <div className="overflow-x-auto">
      <table className={`w-full border-collapse ${compact ? "text-[12px]" : "text-[13px]"}`}>
        <thead>
          <tr className="border-b border-border bg-s2">
            {COLUMNS.map((heading) => (
              <th key={heading} className={`${compact ? "px-3 py-2" : "px-4 py-2.5"} whitespace-nowrap text-left font-mono text-[10px] font-semibold uppercase tracking-wider text-mid`}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fixtures.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length} className="px-4 py-8 text-center text-[13px] text-mid">
                No open freight enquiries right now.
              </td>
            </tr>
          ) : (
            fixtures.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-b-0">
                <td className={`${cell} font-semibold`}>{row.account}</td>
                <td className={`${cell} uppercase`}>{row.product}</td>
                <td className={`${cell} whitespace-nowrap font-mono`}>{row.qty}</td>
                <td className={cell}>{row.origin}</td>
                <td className={cell}>{row.destination}</td>
                <td className={`${cell} whitespace-nowrap`}>{row.laycan}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function FreightCommentary({ text, compact = false }: { text: string; compact?: boolean }) {
  const paragraphs = splitParagraphs(text);
  if (paragraphs.length === 0) return null;
  return (
    <div className={`space-y-3 leading-relaxed text-ink ${compact ? "text-[12.5px]" : "text-[13.5px]"}`}>
      {paragraphs.map((paragraph, i) =>
        /^\*\*[^*]+\*\*$/.test(paragraph) ? (
          <h4 key={i} className="text-[13px] font-bold uppercase tracking-wide">
            {paragraph.slice(2, -2)}
          </h4>
        ) : (
          <p key={i} className="whitespace-pre-line">
            <Inline text={paragraph} />
          </p>
        ),
      )}
    </div>
  );
}

export function FreightAnalytics({ fixtures, commentary }: { fixtures: FreightFixture[]; commentary: string }) {
  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-3.5">
          <h3 className="text-sm font-bold">Freight Analytics - Open Freight Enquiries</h3>
        </div>
        <FreightTable fixtures={fixtures} />
      </section>
      {splitParagraphs(commentary).length ? (
        <section className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Freight Analytics Commentary</h3>
          <FreightCommentary text={commentary} />
        </section>
      ) : null}
    </>
  );
}
