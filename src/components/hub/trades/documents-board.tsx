import Link from "next/link";
import { DocActions } from "@/components/hub/trades/doc-actions";
import { BUYER_TRADES, stageLabel } from "@/lib/buyer-trades/book";

export function DocumentsBoard() {
  const rows = BUYER_TRADES.flatMap((trade) => trade.documents.filter((doc) => doc.status !== "Not applicable").map((doc) => ({ trade, doc }))).slice(0, 12);
  const finals = BUYER_TRADES.reduce((sum, trade) => sum + trade.documents.filter((doc) => doc.status === "Final").length, 0);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] md:text-[30px]">Documents</h1>
          <p className="mt-1 text-[15px] text-mid">One folder per trade. Final versions are marked, so you always know which copy to send to your import agent or broker.</p>
        </div>
        <p className="text-[13px] text-dim">
          {BUYER_TRADES.length} trade folders · {BUYER_TRADES.reduce((s, t) => s + t.documents.length, 0)} documents · {finals} final
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {BUYER_TRADES.map((trade) => (
          <article key={trade.ref} className="aq-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-blue">{trade.ref}</p>
                <p className="text-[13.5px]">
                  {trade.product} · {trade.quantityMt.toLocaleString("en-GB")} MT
                </p>
              </div>
              <span className="rounded-full bg-s2 px-2 py-0.5 text-[11px] font-semibold text-mid">{stageLabel(trade.stage)}</span>
            </div>
            <p className="mt-2 text-[12.5px] text-dim">
              {trade.docsFinal} of {trade.docsTotal} final
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-s2">
              <div className="h-full rounded-full bg-[#1c6b45]" style={{ width: `${(trade.docsFinal / trade.docsTotal) * 100}%` }} />
            </div>
            <div className="mt-3 flex gap-2">
              <Link href={`/hub/trade/${trade.ref}`} className="rounded-full border border-border px-3 py-1.5 text-[12.5px] font-semibold no-underline">
                Open folder
              </Link>
            </div>
          </article>
        ))}
      </div>
      <section className="aq-card overflow-hidden">
        <h2 className="px-5 py-4 text-[16px] font-semibold">All documents</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-y border-border font-mono text-[10.5px] uppercase text-dim">
                <th className="px-5 py-2">Document</th>
                <th>Trade</th>
                <th>Status</th>
                <th>Issued</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ trade, doc }) => (
                <tr key={`${trade.ref}-${doc.name}`} className="border-b border-border last:border-0">
                  <td className="px-5 py-2.5">
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-[12px] text-dim">{doc.file}</p>
                  </td>
                  <td>
                    <Link href={`/hub/trade/${trade.ref}`} className="font-semibold text-blue no-underline">
                      {trade.ref}
                    </Link>
                    <p className="text-[12px] text-dim">{trade.product}</p>
                  </td>
                  <td>{doc.status}</td>
                  <td>{doc.updated}</td>
                  <td>
                    <DocActions doc={doc} refId={trade.ref} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
