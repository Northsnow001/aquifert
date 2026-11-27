"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { DevQuoteBar } from "@/components/admin/trade/dev-quote-bar";
import { RfqDesk } from "@/components/admin/trade/rfq-desk";
import { TradeLive } from "@/components/admin/trade/live-table";
import { formatStamp } from "@/lib/content-types";
import { displayRfqCode } from "@/lib/trade/rfq-code";
import type { TradeRfq } from "@/lib/trade/types";

function statusLabel(status: string) {
  if (status === "rfq_sent") return "Awaiting suppliers";
  if (status === "open") return "Ready to send";
  if (status === "collecting") return "Collecting";
  return status.replaceAll("_", " ");
}

export function RfqBoard({ initial }: { initial: TradeRfq[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <TradeLive resource="rfqs" table="trade_rfqs" initial={initial} render={(rows) => (
      <div>
        <DevQuoteBar />
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Requests", value: rows.length },
            { label: "Ready to send", value: rows.filter((row) => row.status === "open").length },
            { label: "With suppliers", value: rows.filter((row) => row.status === "rfq_sent").length },
            { label: "Quotes in", value: rows.reduce((sum, row) => sum + (row.readyQuoteCount || 0), 0) },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-border bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-dim">{card.label}</p>
              <p className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-ink">{card.value}</p>
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-white">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-border bg-[#f8fafc] text-[11px] font-semibold uppercase tracking-[0.1em] text-dim">
              <tr>
                <th className="px-4 py-3">Request</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-[#f8fafc]"
                    onClick={() => setOpenId(row.id)}
                  >
                    <td className="px-4 py-3 font-semibold text-ink">{displayRfqCode(row.code)}</td>
                    <td className="px-4 py-3 text-mid">{row.buyerCompany || "—"}</td>
                    <td className="px-4 py-3 text-ink">{row.productLabel || "—"}</td>
                    <td className="px-4 py-3 text-mid">{row.quantityMt ? `${row.quantityMt} MT` : "—"}</td>
                    <td className="px-4 py-3 text-mid">{[row.destinationPort, row.destinationCountry].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-4 py-3 text-ink">{statusLabel(row.status)}</td>
                    <td className="px-4 py-3 text-mid">{row.updatedAt ? formatStamp(row.updatedAt) : "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f8fafc] text-ink">
                      <ClipboardList className="h-5 w-5" />
                    </span>
                    <p className="mt-3 text-[15px] font-semibold text-ink">No buyer requests yet</p>
                    <p className="mt-1 text-[13.5px] text-mid">When a buyer confirms an enquiry on WhatsApp, it lands here so you can send it to suppliers and watch the quotes come in.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {openId ? <RfqDesk rfqId={openId} onClose={() => setOpenId(null)} /> : null}
      </div>
    )}
    />
  );
}
