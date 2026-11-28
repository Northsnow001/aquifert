import Link from "next/link";
import { MEMBER_STAGES, type MemberTrade } from "@/lib/buyer-trades/member";

export function TradesHome({ tab, trades }: { tab: "active" | "completed" | "all"; trades: MemberTrade[] }) {
  const active = trades.filter((trade) => trade.stage !== "completed");
  const completed = trades.filter((trade) => trade.stage === "completed");
  const shown = tab === "active" ? active : tab === "completed" ? completed : trades;
  const quotes = trades.filter((trade) => trade.stage === "quote");
  const confirmed = trades.filter((trade) => trade.stage === "confirmed");
  const documents = trades.reduce((sum, trade) => sum + trade.documents.length, 0);
  const activeMt = active.reduce((sum, trade) => sum + (trade.quantityMt ?? 0), 0);
  const counts = new Map(MEMBER_STAGES.map((item) => [item.stage, trades.filter((trade) => trade.stage === item.stage).length]));
  const updates = trades.flatMap((trade) => trade.updates.map((update) => ({ ...update, ref: trade.ref }))).slice(0, 4);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink md:text-[30px]">Your Trades</h1>
          <p className="mt-1 max-w-xl text-[15px] text-mid">Every trade on your account: enquiries with the desk, confirmed orders, and the documents that have been sent to you.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/hub/trade/documents" className="rounded-full border border-border bg-white px-4 py-2 text-[13.5px] font-semibold text-ink no-underline">
            All documents
          </Link>
          <Link href="/hub/order-desk?tab=desk" className="rounded-full bg-[#123a5f] px-4 py-2 text-[13.5px] font-semibold text-white no-underline">
            Request a quote
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active trades" value={String(active.length)} hint={activeMt ? `${activeMt.toLocaleString("en-GB")} MT on your account` : "Enquiries and confirmed orders"} />
        <Stat label="With the desk" value={String(quotes.length)} hint={quotes.length ? "Waiting on a quote or the next step" : "Nothing waiting"} />
        <Stat label="Confirmed" value={String(confirmed.length)} hint={confirmed.length ? "Firm interest or a firm offer" : "None confirmed yet"} />
        <Stat label="Documents sent" value={String(documents)} hint={documents ? "Firm offers, proformas and contracts" : "None sent yet"} />
      </div>

      <div className="aq-card grid grid-cols-3 gap-2 px-2 py-3">
        {MEMBER_STAGES.map((item) => (
          <div key={item.stage} className="px-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-dim">{item.label}</p>
            <p className="text-[22px] font-semibold text-ink">{counts.get(item.stage) ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="aq-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="text-[16px] font-semibold">Trades</h2>
            <div className="flex rounded-full bg-s2 p-0.5 text-[12.5px] font-semibold">
              {(
                [
                  ["active", `Active (${active.length})`],
                  ["completed", `Completed (${completed.length})`],
                  ["all", "All"],
                ] as const
              ).map(([id, label]) => (
                <Link
                  key={id}
                  href={id === "active" ? "/hub/trade" : `/hub/trade?tab=${id}`}
                  className={`rounded-full px-3 py-1 no-underline ${tab === id ? "bg-white text-ink shadow-sm" : "text-mid"}`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          {shown.length === 0 ? (
            <p className="px-4 py-8 text-center text-[14px] text-mid">
              No trades in this view.{" "}
              <Link href="/hub/order-desk?tab=desk" className="font-semibold text-blue no-underline">
                Request a quote
              </Link>
            </p>
          ) : (
            <>
              <ul className="flex flex-col divide-y divide-border md:hidden">
                {shown.map((trade) => (
                  <li key={trade.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/hub/trade/${encodeURIComponent(trade.id)}`} className="font-semibold text-blue no-underline">
                          {trade.ref}
                        </Link>
                        <p className="text-ink">{trade.product}</p>
                        <p className="text-[12.5px] text-mid">{trade.route}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-s2 px-2 py-0.5 text-[11.5px] font-semibold text-mid">{trade.payment}</span>
                    </div>
                    <p className="mt-1 text-[12.5px] text-dim">
                      {trade.stageLabel}
                      {trade.shipment !== "Not nominated" ? ` · ${trade.shipment}` : ""}
                    </p>
                    <Link href={`/hub/trade/${encodeURIComponent(trade.id)}`} className="mt-1 inline-block text-[12.5px] font-semibold text-blue no-underline">
                      Open trade folder
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-border font-mono text-[10.5px] uppercase tracking-wide text-dim">
                      <th className="px-4 py-2">Trade</th>
                      <th>Route</th>
                      <th>Stage</th>
                      <th>Shipment</th>
                      <th>Payment</th>
                      <th>Documents</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((trade) => (
                      <tr key={trade.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3">
                          <Link href={`/hub/trade/${encodeURIComponent(trade.id)}`} className="font-semibold text-blue no-underline">
                            {trade.ref}
                          </Link>
                          <p className="text-ink">{trade.product}</p>
                          {trade.detail ? <p className="text-[12px] text-dim">{trade.detail}</p> : null}
                        </td>
                        <td className="max-w-[180px] text-[12.5px] text-mid">{trade.route}</td>
                        <td>
                          <p className="font-medium">{trade.stageLabel}</p>
                          {trade.stageNote ? <p className="text-[12px] text-dim">{trade.stageNote}</p> : null}
                        </td>
                        <td>
                          <p>{trade.shipment}</p>
                          {trade.shipmentNote ? <p className="text-[12px] text-dim">{trade.shipmentNote}</p> : null}
                        </td>
                        <td>
                          <p>{trade.payment}</p>
                          {trade.paymentNote ? <p className="mt-1 text-[12px] text-dim">{trade.paymentNote}</p> : null}
                        </td>
                        <td>
                          <p>{trade.documents.length ? `${trade.documents.length} sent` : "None yet"}</p>
                          <Link href={`/hub/trade/${encodeURIComponent(trade.id)}`} className="text-[12.5px] font-semibold text-blue no-underline">
                            Open trade folder
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
        <aside className="flex flex-col gap-4">
          <section className="aq-card p-4">
            <h2 className="text-[15px] font-semibold">Latest updates</h2>
            {updates.length ? (
              <ul className="mt-3 space-y-3">
                {updates.map((item) => (
                  <li key={`${item.ref}-${item.when}-${item.text}`}>
                    <p className="text-[12px] text-dim">{item.when}</p>
                    <p className="text-[13px] leading-snug text-ink">
                      <span className="font-semibold">{item.ref}</span> {item.text}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[13px] text-mid">Updates from the desk will show here.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="aq-card px-4 py-3">
      <p className="text-[12.5px] text-mid">{label}</p>
      <p className="mt-1 text-[26px] font-semibold tracking-[-0.03em] text-ink">{value}</p>
      <p className="text-[12.5px] text-dim">{hint}</p>
    </div>
  );
}
