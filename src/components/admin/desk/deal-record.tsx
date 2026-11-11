"use client";

import { useState } from "react";
import { DeskDealBoard } from "@/components/admin/desk/deal-board";
import { Pill } from "@/components/admin/ui";
import { dealDocumentRows } from "@/lib/desk-hitl/documents";
import { selectedOffer } from "@/lib/desk-hitl/logic";
import { DEAL_STATUS_LABEL, type DeskDeal } from "@/lib/desk-hitl/types";

const tabs = [
  { id: "details", label: "Details" },
  { id: "documents", label: "Documents" },
  { id: "history", label: "History & audit" },
] as const;

function when(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function DealRecord({ deal }: { deal: DeskDeal }) {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("details");
  const offer = selectedOffer(deal);
  const docs = dealDocumentRows(deal);
  const audit = [...deal.messages].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-white px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[12px] text-dim">{deal.requestId}</p>
          <Pill tone={deal.pi?.status === "review" ? "amber" : deal.pi?.status === "sent" ? "teal" : "neutral"}>
            {deal.pi?.status === "review" ? "PI to review" : deal.pi?.status === "sent" ? "PI sent" : DEAL_STATUS_LABEL[deal.status]}
          </Pill>
        </div>
        <dl className="mt-3 grid gap-3 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-dim">Buyer</dt>
            <dd className="mt-0.5 text-ink">{deal.buyerName || deal.buyerCompany || "—"}</dd>
            <dd className="text-[12px] text-mid">{deal.buyerPhone || "No WhatsApp"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-dim">Product</dt>
            <dd className="mt-0.5 text-ink">
              {deal.quantityMt ?? "—"} MT {deal.product}
            </dd>
            <dd className="text-[12px] text-mid">
              {deal.incoterm} {deal.destination}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-dim">Buyer price</dt>
            <dd className="mt-0.5 text-ink">
              {deal.pi?.order.unit_price_usd ?? deal.buyerPrice ?? "—"} {deal.currency} / MT
            </dd>
            <dd className="text-[12px] text-mid">{deal.pi?.sentTo ? `PI emailed to ${deal.pi.sentTo}` : "Not emailed yet"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-dim">Supplier (desk only)</dt>
            <dd className="mt-0.5 text-ink">{offer?.supplierName || "Not selected"}</dd>
            <dd className="text-[12px] text-mid">
              {offer ? `${offer.unitPrice} ${offer.currency} / MT` : "Hidden from buyer documents"}
            </dd>
          </div>
        </dl>
      </section>

      <div className="flex gap-1 border-b border-border">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-t-lg px-3 py-2 text-[13px] font-semibold ${
              tab === item.id ? "bg-white text-ink" : "text-mid hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "details" ? (
        <div className="space-y-4">
          <DeskDealBoard deal={deal} />
        </div>
      ) : null}

      {tab === "documents" ? (
        <section className="overflow-hidden rounded-2xl border border-border bg-white">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-border bg-s2/60 text-[11px] uppercase tracking-wide text-dim">
              <tr>
                <th className="px-4 py-2 font-semibold">Party</th>
                <th className="px-4 py-2 font-semibold">Document</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2 font-semibold">To</th>
                <th className="px-4 py-2 font-semibold">When</th>
                <th className="px-4 py-2 font-semibold">File</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-2.5 capitalize text-mid">{row.audience}</td>
                  <td className="px-4 py-2.5 font-medium text-ink">{row.title}</td>
                  <td className="px-4 py-2.5 text-mid">{row.status}</td>
                  <td className="px-4 py-2.5 text-mid">{row.to || "—"}</td>
                  <td className="px-4 py-2.5 text-mid">{when(row.at)}</td>
                  <td className="px-4 py-2.5">
                    <a href={row.href} target="_blank" rel="noreferrer" className="font-semibold text-blue no-underline hover:underline">
                      Open PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {tab === "history" ? (
        <section className="rounded-2xl border border-border bg-white px-4 py-3">
          <ol className="space-y-3">
            {audit.length === 0 ? <p className="text-[13px] text-mid">No events yet.</p> : null}
            {audit.map((msg) => (
              <li key={msg.id} className="border-l-2 border-border pl-3">
                <p className="text-[11px] text-dim">
                  {when(msg.at)} · {msg.from} · {msg.channel}
                  {msg.outboundStatus ? ` · ${msg.outboundStatus}` : ""}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-[13.5px] text-ink">{msg.text}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

    </div>
  );
}
