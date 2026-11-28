import Link from "next/link";
import { BUYER_TRADES, activeTrades, money, routeLabel, stageLabel, type BuyerTrade, type TradeStage } from "@/lib/buyer-trades/book";

const PIPE: { stage: TradeStage; label: string }[] = [
  { stage: "quote", label: "Quote" },
  { stage: "confirmed", label: "Confirmed" },
  { stage: "pre-shipment", label: "Pre-shipment" },
  { stage: "in-transit", label: "In transit" },
  { stage: "arrived", label: "Arrived" },
  { stage: "completed", label: "Completed" },
];

function payTone(trade: BuyerTrade) {
  if (trade.payment === "30% paid") return "bg-[#fff4de] text-[#9a5b00]";
  if (trade.payment === "Advance due") return "bg-[#fff4de] text-[#9a5b00]";
  if (trade.payment === "Paid") return "bg-[#e7f6ee] text-[#1c6b45]";
  return "bg-s2 text-mid";
}

export function TradesHome({ tab }: { tab: "active" | "completed" | "all" }) {
  const active = activeTrades();
  const completed = BUYER_TRADES.filter((trade) => trade.stage === "completed");
  const shown = tab === "active" ? active : tab === "completed" ? completed : BUYER_TRADES;
  const onWater = BUYER_TRADES.filter((trade) => trade.stage === "in-transit");
  const waterMt = onWater.reduce((sum, trade) => sum + trade.quantityMt, 0);
  const due = active.filter((trade) => trade.balanceUsd > 0);
  const dueUsd = due.reduce((sum, trade) => sum + trade.balanceUsd, 0);
  const counts = new Map(PIPE.map((item) => [item.stage, BUYER_TRADES.filter((trade) => trade.stage === item.stage).length]));
  const updates = BUYER_TRADES.flatMap((trade) => trade.updates.map((update) => ({ ...update, ref: trade.ref }))).slice(0, 4);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink md:text-[30px]">Your Trades</h1>
          <p className="mt-1 max-w-xl text-[15px] text-mid">Every trade with Aquifert in one place: where it is, what has been paid, and every finalised document.</p>
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
        <Stat label="Active trades" value={String(active.length)} hint={`${active.reduce((s, t) => s + t.quantityMt, 0).toLocaleString("en-GB")} MT across ${new Set(active.map((t) => t.product)).size} products`} />
        <Stat label="On the water" value={`${waterMt.toLocaleString("en-GB")} MT`} hint={onWater[0] ? `1 vessel · ${onWater[0].vessel}` : "Nothing sailing"} />
        <Stat label="Next arrival" value="2 Dec" hint="Mersin · 15 days in transit left" />
        <Stat label="Payments due" value={money(dueUsd)} hint={`${due.length} invoices · next due 20 Nov`} />
      </div>

      <div className="aq-card grid grid-cols-2 gap-2 px-2 py-3 sm:grid-cols-3 lg:grid-cols-6">
        {PIPE.map((item) => (
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
          <div className="overflow-x-auto">
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
                  <tr key={trade.ref} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/hub/trade/${trade.ref}`} className="font-semibold text-blue no-underline">
                        {trade.ref}
                      </Link>
                      <p className="text-ink">{trade.product}</p>
                      <p className="text-[12px] text-dim">{trade.detail}</p>
                    </td>
                    <td className="max-w-[140px] text-[12.5px] text-mid">{routeLabel(trade)}</td>
                    <td>
                      <p className="font-medium">{stageLabel(trade.stage)}</p>
                      <p className="text-[12px] text-dim">{trade.stageNote}</p>
                    </td>
                    <td>
                      <p>{trade.shipment}</p>
                      <p className="text-[12px] text-dim">{trade.shipmentNote}</p>
                    </td>
                    <td>
                      <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${payTone(trade)}`}>{trade.payment}</span>
                      <p className="mt-1 text-[12px] text-dim">{trade.paymentNote}</p>
                    </td>
                    <td>
                      <p>
                        {trade.docsFinal} of {trade.docsTotal} final
                      </p>
                      <Link href={`/hub/trade/${trade.ref}`} className="text-[12.5px] font-semibold text-blue no-underline">
                        Open trade folder
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <aside className="flex flex-col gap-4">
          <section className="aq-card p-4">
            <h2 className="text-[15px] font-semibold">Latest updates</h2>
            <ul className="mt-3 space-y-3">
              {updates.map((item) => (
                <li key={`${item.ref}-${item.when}`}>
                  <p className="text-[12px] text-dim">{item.when}</p>
                  <p className="text-[13px] leading-snug text-ink">
                    <span className="font-semibold">{item.ref}</span> {item.text}
                  </p>
                </li>
              ))}
            </ul>
          </section>
          <section className="aq-card p-4">
            <h2 className="text-[15px] font-semibold">Coming up</h2>
            <ul className="mt-3 space-y-3 text-[13px]">
              <li>
                <span className="font-semibold text-[#9a5b00]">20 Nov</span> 30% advance (USD 96,000) due for AQ-2611-047 DAP.
              </li>
              <li>
                <span className="font-semibold text-mid">19 Nov</span> TSP quote AQ-2611-053 expires. Reply on WhatsApp or email to confirm.
              </li>
              <li>
                <span className="font-semibold text-blue">2 Dec</span> MV Aegean Trader due at Mersin with AQ-2611-042.
              </li>
            </ul>
          </section>
        </aside>
      </div>
      <p className="rounded-2xl border border-dashed border-border px-4 py-3 text-[12.5px] text-mid">
        Sample AQ Zero book for Marmara Agri, so you can see the trade record before a live shipment is on your account. Only people you invite can see a real folder.{" "}
        <Link href="/hub/account/legal" className="font-semibold text-blue no-underline">
          How we protect your data
        </Link>
      </p>
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
