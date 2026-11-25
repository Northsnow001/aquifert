"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { endNegotiationAction, handNegotiationToAgentAction, sendDeskReplyAction } from "@/app/admin/desk/actions";
import { ShortlistPanel } from "@/components/admin/desk/shortlist-panel";
import { AfterPayment } from "@/components/admin/desk/after-payment";
import { FoEditor } from "@/components/admin/desk/fo-editor";
import { PiEditor } from "@/components/admin/desk/pi-editor";
import { btnPrimary, btnSecondary, input, label, textarea } from "@/components/admin/ui";
import { agreedPriceFromThread } from "@/lib/desk-hitl/logic";
import { DEAL_STATUS_LABEL, type DeskDeal } from "@/lib/desk-hitl/types";

export function DeskDealBoard({ deal, template, terms }: { deal: DeskDeal; template: string; terms: string }) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const suggested = agreedPriceFromThread(deal);
  const [agreed, setAgreed] = useState(suggested != null ? String(suggested) : "");
  const [pending, start] = useTransition();
  const matt = Boolean(deal.mattThread && deal.status === "negotiating");

  useEffect(() => {
    if (!matt) return;
    const timer = window.setInterval(() => router.refresh(), 8000);
    return () => window.clearInterval(timer);
  }, [matt, router]);

  const send = () => {
    start(async () => {
      const result = await sendDeskReplyAction({ id: deal.id, text: reply });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setReply("");
      toast.success(matt ? "Sent to the buyer." : "Reply queued for WhatsApp.");
      router.refresh();
    });
  };

  const handOver = () => {
    start(async () => {
      const result = await handNegotiationToAgentAction({ id: deal.id, price: Number(agreed) });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`Handed over at ${deal.currency || "USD"} ${agreed} / MT. The buyer was asked about packing.`);
      router.refresh();
    });
  };

  const endChat = () => {
    start(async () => {
      const result = await endNegotiationAction({ id: deal.id });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Conversation ended.");
      router.push("/admin/desk/negotiation");
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-mid">
        <span className="font-semibold text-ink">{DEAL_STATUS_LABEL[deal.status]}</span>
        {deal.buyerPhone ? ` · ${deal.buyerPhone}` : " · no WhatsApp number on the shortlist"}
      </p>

      <ShortlistPanel deal={deal} template={template} />

      {deal.buyerPrice != null && (deal.firmOffer || deal.execution?.confirmedAt || deal.buyerPlan === "aq_zero") ? <FoEditor deal={deal} terms={terms} /> : null}
      {deal.pi ? <PiEditor deal={deal} /> : null}
      {deal.pi?.status === "sent" ? <AfterPayment deal={deal} /> : null}

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
        {matt ? (
          <div className="border-t border-border px-4 py-3">
            <p className="text-[12.5px] text-mid">You have this conversation. The buyer’s replies land here. The agent stays quiet.</p>
            <label className={label} htmlFor="reply">
              Reply on WhatsApp
            </label>
            <textarea id="reply" value={reply} onChange={(e) => setReply(e.target.value)} className={`${textarea} mt-1`} rows={3} />
            <label className={`${label} mt-3`} htmlFor="agreed">
              Agreed price / MT
            </label>
            <input
              id="agreed"
              inputMode="decimal"
              value={agreed}
              onChange={(e) => setAgreed(e.target.value)}
              className={`${input} mt-1 max-w-[8rem]`}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" disabled={pending || !reply.trim()} onClick={send} className={btnPrimary}>
                Send to buyer
              </button>
              <button type="button" disabled={pending || !(Number(agreed) > 0)} onClick={handOver} className={btnSecondary}>
                Hand to firm offer agent
              </button>
              <button type="button" disabled={pending} onClick={endChat} className={btnSecondary}>
                End conversation
              </button>
            </div>
          </div>
        ) : deal.status === "indication_sent" || deal.status === "negotiating" ? (
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
