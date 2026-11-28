import Link from "next/link";
import { DocActions } from "@/components/hub/trades/doc-actions";
import type { MemberTrade } from "@/lib/buyer-trades/member";

export function DocumentsBoard({ trades }: { trades: MemberTrade[] }) {
  const rows = trades.flatMap((trade) => trade.documents.map((doc) => ({ trade, doc })));
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] md:text-[30px]">Documents</h1>
          <p className="mt-1 max-w-xl text-[15px] text-mid">Documents the desk has sent on your trades. A file appears here once it has been issued to you.</p>
        </div>
        <p className="text-[13px] text-dim">
          {trades.length} {trades.length === 1 ? "trade" : "trades"} · {rows.length} {rows.length === 1 ? "document" : "documents"}
        </p>
      </div>
      {trades.length === 0 ? (
        <p className="aq-card px-4 py-8 text-center text-[14px] text-mid">
          No trades on your account yet.{" "}
          <Link href="/hub/order-desk?tab=desk" className="font-semibold text-blue no-underline">
            Request a quote
          </Link>
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {trades.map((trade) => (
            <article key={trade.id} className="aq-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-blue">{trade.ref}</p>
                  <p className="text-[13.5px]">
                    {trade.product}
                    {trade.quantityMt ? ` · ${trade.quantityMt.toLocaleString("en-GB")} MT` : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-s2 px-2 py-0.5 text-[11px] font-semibold text-mid">{trade.stageLabel}</span>
              </div>
              <p className="mt-2 text-[12.5px] text-dim">{trade.documents.length ? `${trade.documents.length} sent` : "No documents sent yet"}</p>
              <div className="mt-3">
                <Link href={`/hub/trade/${encodeURIComponent(trade.id)}`} className="rounded-full border border-border px-3 py-1.5 text-[12.5px] font-semibold no-underline">
                  Open folder
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
      <section className="aq-card overflow-hidden">
        <h2 className="px-5 py-4 text-[16px] font-semibold">All documents</h2>
        {rows.length === 0 ? (
          <p className="px-5 pb-6 text-[14px] text-mid">Nothing has been sent yet. Firm offers, proformas and sales contracts show up here after the desk issues them.</p>
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-border md:hidden">
              {rows.map(({ trade, doc }) => (
                <li key={`${trade.id}-${doc.kind}`} className="px-4 py-3">
                  <p className="font-medium text-ink">{doc.name}</p>
                  <p className="mt-1 text-[13px]">
                    <Link href={`/hub/trade/${encodeURIComponent(trade.id)}`} className="font-semibold text-blue no-underline">
                      {trade.ref}
                    </Link>
                    <span className="text-mid"> · {doc.status}{doc.updated ? ` · ${doc.updated}` : ""}</span>
                  </p>
                  <div className="mt-1">
                    <DocActions doc={doc} />
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] text-left text-[13px]">
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
                    <tr key={`${trade.id}-${doc.kind}`} className="border-b border-border last:border-0">
                      <td className="px-5 py-2.5 font-medium">{doc.name}</td>
                      <td>
                        <Link href={`/hub/trade/${encodeURIComponent(trade.id)}`} className="font-semibold text-blue no-underline">
                          {trade.ref}
                        </Link>
                        <p className="text-[12px] text-dim">{trade.product}</p>
                      </td>
                      <td>{doc.status}</td>
                      <td className="whitespace-nowrap">{doc.updated || "—"}</td>
                      <td>
                        <DocActions doc={doc} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
