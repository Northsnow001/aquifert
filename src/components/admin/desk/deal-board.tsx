"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { confirmIndicationAction, issueSupplierPackAction, sendDeskReplyAction } from "@/app/admin/desk/actions";
import { PiEditor } from "@/components/admin/desk/pi-editor";
import { btnPrimary, btnSecondary, input, label, textarea } from "@/components/admin/ui";
import { buyerUnitPrice } from "@/lib/desk-hitl/logic";
import { DEAL_STATUS_LABEL, type DeskDeal } from "@/lib/desk-hitl/types";

const money = (n: number, currency: string) =>
  `${currency} ${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function DeskDealBoard({ deal }: { deal: DeskDeal }) {
  const router = useRouter();
  const waiting = deal.status === "waiting_desk";
  const [offerId, setOfferId] = useState(deal.selectedOfferId ?? deal.offers[0]?.id ?? "");
  const [margin, setMargin] = useState(deal.marginPct != null ? String(deal.marginPct) : "8");
  const [reply, setReply] = useState("");
  const [pending, start] = useTransition();

  const offer = deal.offers.find((item) => item.id === offerId) ?? deal.offers[0];
  const marginPct = Number(margin);
  const preview =
    offer && Number.isFinite(marginPct) ? buyerUnitPrice(offer.unitPrice, marginPct) : null;

  const confirm = () => {
    start(async () => {
      const result = await confirmIndicationAction({ id: deal.id, offerId, marginPct });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Indication queued for WhatsApp. n8n will send it to the buyer.");
      router.refresh();
    });
  };

  const send = () => {
    start(async () => {
      const result = await sendDeskReplyAction({ id: deal.id, text: reply });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setReply("");
      toast.success("Reply queued for WhatsApp.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-mid">
        <span className="font-semibold text-ink">{DEAL_STATUS_LABEL[deal.status]}</span>
        {deal.buyerPhone ? ` · ${deal.buyerPhone}` : " · no WhatsApp number on the shortlist"}
      </p>

      <section className="space-y-2">
        {deal.offers.map((item) => {
          const selected = item.id === offerId;
          return (
            <label
              key={item.id}
              className={`block cursor-pointer rounded-2xl border px-4 py-3 ${
                selected ? "border-blue bg-blue-light/40" : "border-border bg-white"
              } ${waiting ? "" : "cursor-default"}`}
            >
              <div className="flex items-start gap-3">
                {waiting ? (
                  <input
                    type="radio"
                    name="offer"
                    className="mt-1"
                    checked={selected}
                    onChange={() => setOfferId(item.id)}
                  />
                ) : (
                  <span className="mt-1 h-4 w-4" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold text-ink">{item.supplierName}</span>
                    <span className="font-mono text-[14px] text-ink">{money(item.unitPrice, item.currency)}</span>
                  </span>
                  <span className="mt-1 block text-[12.5px] text-mid">
                    {[item.incoterm, item.loadPort, item.destination].filter(Boolean).join(" · ") || "No extra terms"}
                    {item.wechatOpenId ? ` · WeChat ${item.wechatOpenId}` : ""}
                  </span>
                </span>
              </div>
            </label>
          );
        })}
      </section>

      {waiting ? (
        <section className="rounded-2xl border border-border bg-white px-4 py-4">
          <label className={label} htmlFor="margin">
            Your margin %
          </label>
          <input
            id="margin"
            inputMode="decimal"
            value={margin}
            onChange={(e) => setMargin(e.target.value)}
            className={`${input} mt-1 max-w-[8rem]`}
          />
          <p className="mt-2 text-[13.5px] text-ink">
            Buyer sees{" "}
            <span className="font-semibold">
              {preview != null && offer ? money(preview, offer.currency) : "—"} / MT
            </span>
          </p>
          <button type="button" disabled={pending || !offerId} onClick={confirm} className={`${btnPrimary} mt-4 w-full sm:w-auto`}>
            {pending ? "Sending…" : "Send indication to buyer"}
          </button>
        </section>
      ) : (
        <section className="rounded-2xl border border-border bg-white px-4 py-3 text-[13.5px]">
          <p>
            Indication{" "}
            <span className="font-semibold">
              {deal.buyerPrice != null ? money(deal.buyerPrice, deal.currency) : "—"} / MT
            </span>
            {deal.marginPct != null ? ` (supplier + ${deal.marginPct}%)` : ""}
          </p>
          {deal.status === "firm_interest" && deal.pi?.status === "sent" ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                start(async () => {
                  const result = await issueSupplierPackAction({ id: deal.id });
                  if (!result.ok) {
                    toast.error(result.message);
                    return;
                  }
                  toast.success("Supplier documents queued. n8n will email the PO pack.");
                  router.refresh();
                });
              }}
              className={`${btnPrimary} mt-3 w-full sm:w-auto`}
            >
              {pending ? "Issuing…" : "Issue supplier documents"}
            </button>
          ) : null}
        </section>
      )}

      {deal.pi ? <PiEditor deal={deal} /> : null}

      <section className="rounded-2xl border border-border bg-white">
        <h2 className="border-b border-border px-4 py-2.5 text-[13px] font-semibold text-ink">Thread</h2>
        <ul className="max-h-[50vh] space-y-2 overflow-y-auto px-4 py-3">
          {deal.messages.map((msg) => (
            <li
              key={msg.id}
              className={`max-w-[92%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                msg.from === "buyer"
                  ? "ml-auto bg-blue text-white"
                  : msg.from === "desk"
                    ? "bg-s2 text-ink"
                    : "text-[12px] text-dim"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>
              {msg.outboundStatus === "queued" ? <p className="mt-1 text-[11px] opacity-80">Queued for WhatsApp</p> : null}
            </li>
          ))}
        </ul>
        {deal.status === "indication_sent" || deal.status === "negotiating" ? (
          <div className="border-t border-border px-4 py-3">
            <label className={label} htmlFor="reply">
              Reply on WhatsApp
            </label>
            <textarea id="reply" value={reply} onChange={(e) => setReply(e.target.value)} className={`${textarea} mt-1`} rows={3} />
            <button type="button" disabled={pending || !reply.trim()} onClick={send} className={`${btnSecondary} mt-2`}>
              Queue reply
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
