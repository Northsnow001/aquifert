"use client";

import { useEffect, useState, useTransition } from "react";
import { FlaskConical, MessageCircle, Radio, X } from "lucide-react";
import { toast } from "sonner";
import { fanOutRfqAction, generateDevQuotesAction, getRfqDeskAction } from "@/app/admin/trade/actions";
import { SupplierThread } from "@/components/admin/trade/supplier-thread";
import { btnGhost, btnPrimary, btnSecondary } from "@/components/admin/ui";
import { formatStamp } from "@/lib/content-types";
import {
  RFQ_ASK_LABEL,
  type RfqAskStatus,
  type TradeRfqAsk,
  type TradeRfqDesk,
  type TradeSupplier,
} from "@/lib/trade/types";

const ASK_TONE: Record<RfqAskStatus, string> = {
  queued: "bg-s2 text-mid",
  skipped: "bg-s2 text-mid",
  sent: "bg-[#e8f1fb] text-blue",
  failed: "bg-[#fdecec] text-danger",
  quoted: "bg-[#eaf7ef] text-[#1f7a45]",
  no_offer: "bg-[#fff6e5] text-[#9a5b00]",
};

function millStub(ask: TradeRfqAsk): TradeSupplier {
  return {
    id: ask.supplierId,
    code: "",
    companyName: ask.companyName,
    contactName: ask.contactName,
    email: "",
    whatsappE164: null,
    wechatOpenid: ask.wechatOpenid,
    country: "",
    address: "",
    productsSupplied: "",
    origins: [],
    loadPorts: [],
    paymentTerms: "",
    status: "active",
    onboardingStatus: ask.wechatOpenid ? "subscribed" : "to_invite",
    qrTicket: null,
    qrScene: null,
    invitedAt: null,
    lastRfqCode: null,
    awaitingReply: null,
    lastContactAt: null,
    notes: "",
    createdAt: "",
    updatedAt: "",
  };
}

function fact(label: string, value: string) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-dim">{label}</p>
      <p className="mt-0.5 text-[13.5px] text-ink">{value}</p>
    </div>
  );
}

export function RfqDesk({ rfqId, onClose }: { rfqId: string; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [desk, setDesk] = useState<TradeRfqDesk | null>(null);
  const [devTools, setDevTools] = useState(false);
  const [quoteTarget, setQuoteTarget] = useState(3);
  const [error, setError] = useState("");
  const [thread, setThread] = useState<TradeRfqAsk | null>(null);

  const load = () => {
    getRfqDeskAction(rfqId).then((result) => {
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError("");
      setDesk(result.desk);
      setDevTools(result.devTools);
    });
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId]);

  const generate = () => {
    start(async () => {
      const result = await generateDevQuotesAction(rfqId, quoteTarget);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Linked ${result.created} dummy quote${result.created === 1 ? "" : "s"} to ${result.rfqCode || "this request"} · ${result.unique} unique so far`,
      );
      load();
    });
  };

  const send = (resendFailed: boolean) => {
    start(async () => {
      const result = await fanOutRfqAction(rfqId, resendFailed);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Sent to ${result.sent} suppliers${result.failed ? ` · ${result.failed} failed` : ""}`);
      load();
    });
  };

  const sent = desk?.asks.filter((ask) => ask.status === "sent" || ask.status === "quoted" || ask.status === "no_offer").length ?? 0;
  const quoted = desk?.asks.filter((ask) => ask.status === "quoted").length ?? 0;
  const failed = desk?.asks.filter((ask) => ask.status === "failed").length ?? 0;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/25" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-[720px] flex-col bg-white shadow-[-24px_0_60px_-32px_rgb(16_38_59/0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dim">Trade</p>
            <h2 className="mt-1 truncate text-[18px] font-semibold tracking-[-0.03em] text-ink">{desk?.code || "Buyer request"}</h2>
            <p className="mt-0.5 text-[12.5px] text-mid">
              {desk ? `${desk.buyerCompany || "Buyer"} · ${desk.productLabel || "Product"}` : "Loading…"}
            </p>
          </div>
          <button type="button" className={btnGhost} onClick={onClose} aria-label="Close trade">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error ? <p className="mb-4 rounded-xl border border-[#f2d9a0] bg-[#fffaf0] px-4 py-3 text-[13.5px] text-[#7a5200]">{error}</p> : null}
          {!desk ? (
            <p className="text-[13.5px] text-mid">Loading this trade…</p>
          ) : (
            <>
              <section className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-[#f8fafc] p-4 sm:grid-cols-3">
                {fact("Buyer", [desk.buyerContact, desk.buyerCompany].filter(Boolean).join(" · "))}
                {fact("Product", desk.productLabel)}
                {fact("Quantity", desk.quantityMt ? `${desk.quantityMt} MT` : "")}
                {fact("Packing", desk.packing)}
                {fact("Incoterm", desk.incoterm)}
                {fact("Destination", [desk.destinationPort, desk.destinationCountry].filter(Boolean).join(", "))}
                {fact("Shipment", desk.shipmentWindow)}
                {fact("Status", desk.status.replaceAll("_", " "))}
                {fact("Opened", desk.createdAt ? formatStamp(desk.createdAt) : "")}
              </section>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button type="button" className={btnPrimary} disabled={pending} onClick={() => send(false)}>
                  <Radio className="h-3.5 w-3.5" />
                  {sent ? "Send to remaining" : "Send to suppliers"}
                </button>
                {failed ? (
                  <button type="button" className={btnSecondary} disabled={pending} onClick={() => send(true)}>
                    Retry failed
                  </button>
                ) : null}
                <p className="text-[12.5px] text-mid">
                  {sent} sent · {quoted} quoted · {failed} failed
                </p>
                <p className="w-full text-[12px] text-dim">
                  Matt sees this after 3 unique supplier quotes, or after 24 hours with at least one.
                </p>
              </div>
              {devTools ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-[#e2c48a] bg-[#fffaf0] px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9a5b00]">Dev only</p>
                  <label htmlFor="dev-quote-target" className="flex items-center gap-1.5 text-[12.5px] text-mid">
                    How many dummy quotes
                    <input
                      id="dev-quote-target"
                      type="number"
                      min={1}
                      max={8}
                      value={quoteTarget}
                      onChange={(event) => setQuoteTarget(Math.min(8, Math.max(1, Number(event.target.value) || 1)))}
                      className="w-14 rounded-lg border border-border bg-white px-2 py-1 text-[13px] text-ink"
                    />
                  </label>
                  <button type="button" className={btnSecondary} disabled={pending} onClick={generate}>
                    <FlaskConical className="h-3.5 w-3.5" />
                    Generate quotes
                  </button>
                  <p className="text-[12px] text-[#7a5200]">Fills missing unique suppliers only. Safe to remove later.</p>
                </div>
              ) : null}

              <h3 className="mt-6 text-[12px] font-semibold uppercase tracking-[0.12em] text-dim">Suppliers</h3>
              <ul className="mt-2 divide-y divide-border rounded-2xl border border-border">
                {desk.asks.length ? (
                  desk.asks.map((ask) => (
                    <li key={ask.id} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-semibold text-ink">{ask.companyName}</p>
                        <p className="truncate text-[12px] text-mid">
                          {ask.contactName || "—"}
                          {ask.unitPrice ? ` · ${ask.unitPrice} USD/MT` : ""}
                          {ask.incoterm ? ` ${ask.incoterm}` : ""}
                          {ask.loadPort ? ` ${ask.loadPort}` : ""}
                        </p>
                        {ask.error ? <p className="mt-0.5 text-[12px] text-danger">{ask.error}</p> : null}
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ASK_TONE[ask.status]}`}>
                        {RFQ_ASK_LABEL[ask.status]}
                      </span>
                      <button type="button" className={btnGhost} onClick={() => setThread(ask)}>
                        <MessageCircle className="h-3.5 w-3.5" />
                        Chat
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="px-4 py-6 text-[13.5px] text-mid">Not sent yet. Send to suppliers to start tracking replies.</li>
                )}
              </ul>
            </>
          )}
        </div>
      </aside>
      {thread ? <SupplierThread supplier={millStub(thread)} onClose={() => setThread(null)} /> : null}
    </div>
  );
}
