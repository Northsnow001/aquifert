import Link from "next/link";
import { DocActions } from "@/components/hub/trades/doc-actions";
import { money, stageLabel, type BuyerTrade } from "@/lib/buyer-trades/book";

export function TradeDetail({ trade }: { trade: BuyerTrade }) {
  if (trade.stage === "completed" && trade.summary) return <Completed trade={trade} />;
  const days = trade.eta ? "15 days left in transit" : null;
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] text-mid">
        <Link href="/hub/order-desk/trades" className="text-blue no-underline">
          Trades
        </Link>{" "}
        / {trade.ref}
      </p>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-blue">{trade.ref}</span>
            <span className="rounded-full bg-[#e8f1fb] px-2 py-0.5 text-[12px] font-semibold text-blue">{stageLabel(trade.stage)}</span>
            <span className="rounded-full bg-[#fff4de] px-2 py-0.5 text-[12px] font-semibold text-[#9a5b00]">{trade.paymentNote}</span>
          </div>
          <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.02em]">
            {trade.product} · {trade.quantityMt.toLocaleString("en-GB")} MT
          </h1>
          <p className="text-[14px] text-mid">
            {trade.incoterm} · Confirmed {trade.confirmed || "—"}
            {trade.buyerRef ? ` · Your reference ${trade.buyerRef}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/hub/order-desk?tab=desk" className="rounded-full border border-border bg-white px-4 py-2 text-[13px] font-semibold no-underline">
            Ask about this trade
          </Link>
          <span className="rounded-full bg-[#123a5f] px-4 py-2 text-[13px] font-semibold text-white">Download doc pack</span>
        </div>
      </div>

      <section className="aq-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-dim">Shipment</p>
            <p className="text-[16px] font-semibold">{trade.vessel}</p>
            <p className="text-[13px] text-mid">
              {trade.loadPort}, {trade.originCountry} → {trade.dischPort}, {trade.destination}
            </p>
          </div>
          {days ? <p className="text-right text-[28px] font-semibold text-blue">{days.replace(" left in transit", "")}</p> : null}
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-s2">
          <div className="h-full w-4/5 rounded-full bg-blue" />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="aq-card p-5">
          <h2 className="text-[16px] font-semibold">Trade journey</h2>
          <ol className="mt-4 space-y-3">
            {trade.journey.map((step) => (
              <li key={step.label} className="grid grid-cols-[16px_minmax(0,1fr)_auto] gap-3 text-[13.5px]">
                <span className={`mt-1 h-2.5 w-2.5 rounded-full ${step.state === "later" ? "bg-s3" : step.state === "now" ? "bg-blue ring-4 ring-blue/20" : "bg-[#1c6b45]"}`} />
                <span>
                  <span className="font-medium">{step.label}</span>
                  <span className="block text-[12.5px] text-dim">{step.detail}</span>
                </span>
                <span className="text-[12px] text-dim">{step.date}</span>
              </li>
            ))}
          </ol>
        </section>
        <div className="flex flex-col gap-4">
          <section className="aq-card p-5">
            <h2 className="text-[16px] font-semibold">Key terms</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
              {trade.terms.map((term) => (
                <div key={term.label}>
                  <dt className="text-dim">{term.label}</dt>
                  <dd className="font-medium">{term.value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="aq-card p-5">
            <h2 className="text-[16px] font-semibold">Payments</h2>
            <p className="mt-2 text-[13.5px]">Advance · {money(trade.paidUsd)} paid</p>
            <p className="text-[13.5px]">Balance · {money(trade.balanceUsd)}{trade.balanceUsd ? " · due on final docs" : ""}</p>
          </section>
        </div>
      </div>

      <section className="aq-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-[16px] font-semibold">
            Documents · {trade.docsFinal} of {trade.docsTotal} final
          </h2>
        </div>
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-y border-border font-mono text-[10.5px] uppercase text-dim">
              <th className="px-5 py-2">Document</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {trade.documents.map((doc) => (
              <tr key={doc.name} className="border-b border-border last:border-0">
                <td className="px-5 py-2.5">
                  <p className="font-medium">{doc.name}</p>
                  <p className="text-[12px] text-dim">{doc.file}</p>
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
      </section>
    </div>
  );
}

function Completed({ trade }: { trade: BuyerTrade }) {
  const summary = trade.summary!;
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] text-mid">
        <Link href="/hub/order-desk/trades" className="no-underline">
          Trades
        </Link>{" "}
        / {trade.ref} / Trade summary
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#e7f6ee] px-5 py-4">
        <div>
          <p className="text-[18px] font-semibold text-[#1c6b45]">
            Trade complete · {trade.product} · {trade.quantityMt.toLocaleString("en-GB")} MT
          </p>
          <p className="text-[13px] text-[#1c6b45]">Closed {trade.closed}. Paid in full. Your final document pack is below and stays here for audit.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/hub/order-desk?tab=desk" className="rounded-full border border-[#1c6b45]/30 bg-white px-4 py-2 text-[13px] font-semibold no-underline">
            Request this again
          </Link>
          <span className="rounded-full bg-[#123a5f] px-4 py-2 text-[13px] font-semibold text-white">Download final doc pack</span>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article className="aq-card p-6">
          <div className="flex items-start justify-between">
            <p className="text-[18px] font-semibold text-blue">aquifert</p>
            <div className="text-right">
              <p className="font-semibold">TRADE SUMMARY</p>
              <p className="text-[12px] text-dim">
                {trade.ref} · Issued {trade.closed}
              </p>
            </div>
          </div>
          <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-blue pt-4 text-[13px]">
            <div>
              <dt className="text-dim">Seller</dt>
              <dd className="font-semibold">{summary.seller}</dd>
            </div>
            <div>
              <dt className="text-dim">Buyer</dt>
              <dd className="font-semibold">{summary.buyer}</dd>
              <dd className="text-dim">{trade.buyerRef}</dd>
            </div>
            <div>
              <dt className="text-dim">Contract</dt>
              <dd className="font-semibold">{summary.contract}</dd>
              <dd className="text-dim">Confirmed {trade.confirmed}</dd>
            </div>
          </dl>
          <h2 className="mt-6 text-[12px] font-semibold uppercase tracking-wide text-dim">Product & shipment</h2>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-3">
            {trade.terms.map((term) => (
              <div key={term.label}>
                <dt className="text-dim">{term.label}</dt>
                <dd className="font-medium">{term.value}</dd>
              </div>
            ))}
          </dl>
          <h2 className="mt-6 text-[12px] font-semibold uppercase tracking-wide text-dim">Timeline</h2>
          <ol className="mt-2 flex flex-wrap gap-4 text-[12.5px]">
            {summary.timeline.map((item) => (
              <li key={item.label}>
                <p className="font-semibold">{item.label}</p>
                <p className="text-dim">{item.date}</p>
              </li>
            ))}
          </ol>
          <h2 className="mt-6 text-[12px] font-semibold uppercase tracking-wide text-dim">Financial summary</h2>
          <dl className="mt-2 space-y-1 text-[13.5px]">
            <div className="flex justify-between">
              <dt>Price</dt>
              <dd>{trade.price}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Invoiced quantity</dt>
              <dd>{summary.shippedMt}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Invoice value</dt>
              <dd>{summary.invoiceValue}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Payment terms</dt>
              <dd>{summary.paymentTerms}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Received</dt>
              <dd>{summary.received}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>Balance outstanding</dt>
              <dd>USD 0.00</dd>
            </div>
          </dl>
        </article>
        <aside className="aq-card p-5">
          <h2 className="font-semibold">Final document pack</h2>
          <p className="text-[12.5px] text-dim">
            {trade.docsFinal} of {trade.docsTotal} final
          </p>
          <ul className="mt-3 space-y-2">
            {trade.documents.map((doc) => (
              <li key={doc.name} className="flex items-center justify-between gap-2 text-[13px]">
                <span>{doc.name}</span>
                <DocActions doc={doc} refId={trade.ref} />
              </li>
            ))}
          </ul>
          <Link href={`/hub/order-desk?tab=desk&product=${encodeURIComponent(trade.product)}`} className="mt-4 block rounded-xl border border-border px-3 py-2 text-center text-[13px] font-semibold no-underline">
            Request a quote on the same terms
          </Link>
        </aside>
      </div>
    </div>
  );
}
