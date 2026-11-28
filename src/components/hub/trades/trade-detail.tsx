import Link from "next/link";
import { DocActions } from "@/components/hub/trades/doc-actions";
import type { MemberTrade } from "@/lib/buyer-trades/member";

export function TradeDetail({ trade }: { trade: MemberTrade }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] text-mid">
        <Link href="/hub/trade" className="text-blue no-underline">
          Trades
        </Link>{" "}
        / {trade.ref}
      </p>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-blue">{trade.ref}</span>
            <span className="rounded-full bg-[#e8f1fb] px-2 py-0.5 text-[12px] font-semibold text-blue">{trade.stageLabel}</span>
          </div>
          <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.02em] sm:text-[28px]">
            {trade.product}
            {trade.quantityMt ? ` · ${trade.quantityMt.toLocaleString("en-GB")} MT` : ""}
          </h1>
          <p className="text-[14px] text-mid">{trade.route}</p>
          {trade.stageNote ? <p className="text-[13px] text-dim">{trade.stageNote}</p> : null}
        </div>
        <Link href="/hub/order-desk?tab=desk" className="rounded-full border border-border bg-white px-4 py-2 text-[13px] font-semibold no-underline">
          Ask about this trade
        </Link>
      </div>

      <section className="aq-card p-5">
        <p className="font-mono text-[11px] uppercase tracking-wide text-dim">Shipment</p>
        <p className="text-[16px] font-semibold">{trade.shipment}</p>
        {trade.shipmentNote ? <p className="text-[13px] text-mid">{trade.shipmentNote}</p> : null}
        <p className="mt-3 text-[13.5px]">{trade.payment}{trade.paymentNote ? ` · ${trade.paymentNote}` : ""}</p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="aq-card p-5">
          <h2 className="text-[16px] font-semibold">Terms</h2>
          {trade.terms.length ? (
            <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-2">
              {trade.terms.map((term) => (
                <div key={term.label}>
                  <dt className="text-dim">{term.label}</dt>
                  <dd className="font-medium">{term.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 text-[13.5px] text-mid">The desk has not recorded terms on this trade yet.</p>
          )}
        </section>
        <section className="aq-card p-5">
          <h2 className="text-[16px] font-semibold">Updates</h2>
          {trade.updates.length ? (
            <ul className="mt-3 space-y-3">
              {trade.updates.map((update) => (
                <li key={`${update.when}-${update.text}`}>
                  <p className="text-[12px] text-dim">{update.when}</p>
                  <p className="text-[13.5px] text-ink">{update.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[13.5px] text-mid">No messages on this trade yet.</p>
          )}
        </section>
      </div>

      <section className="aq-card overflow-hidden">
        <h2 className="px-5 py-4 text-[16px] font-semibold">Documents · {trade.documents.length} sent</h2>
        {trade.documents.length === 0 ? (
          <p className="px-5 pb-5 text-[14px] text-mid">The desk has not sent a document on this trade yet.</p>
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-border md:hidden">
              {trade.documents.map((doc) => (
                <li key={doc.kind} className="px-4 py-3">
                  <p className="font-medium">{doc.name}</p>
                  <p className="mt-1 text-[13px] text-mid">
                    {doc.status}
                    {doc.updated ? ` · ${doc.updated}` : ""}
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
                    <th>Status</th>
                    <th>Issued</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trade.documents.map((doc) => (
                    <tr key={doc.kind} className="border-b border-border last:border-0">
                      <td className="px-5 py-2.5 font-medium">{doc.name}</td>
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
