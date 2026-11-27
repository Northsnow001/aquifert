"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  confirmIndicationAction,
  continueWithoutIndicationAction,
  markSupplierDocumentAction,
  messageSupplierAction,
  saveIndicationDraftAction,
  setBuyerPlanAction,
  setOfferShortlistAction,
} from "@/app/admin/desk/actions";
import { btnPrimary, btnSecondary, input, label, textarea } from "@/components/admin/ui";
import { displayRfqCode } from "@/lib/trade/rfq-code";
import { indicationDraftText } from "@/lib/desk-hitl/gates";
import { buyerUnitPrice } from "@/lib/desk-hitl/logic";
import type { BuyerPlan, DeskDeal, DeskOffer, OfferChannel } from "@/lib/desk-hitl/types";

const money = (n: number, currency: string) => `${currency} ${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function when(iso: string) {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return iso || "—";
  return new Date(time).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const CHANNEL: Record<OfferChannel, string> = { email: "Email", wechat: "WeChat", whatsapp: "WhatsApp" };

function channelOf(offer: DeskOffer): OfferChannel {
  return offer.channel ?? (offer.wechatOpenId ? "wechat" : "email");
}

const CHECKS = [
  { kind: "coa" as const, label: "COA" },
  { kind: "tds" as const, label: "TDS" },
  { kind: "photos" as const, label: "Product photos" },
  { kind: "firmOffer" as const, label: "Firm offer" },
];

export function ShortlistPanel({ deal, template }: { deal: DeskDeal; template: string }) {
  const router = useRouter();
  const waiting = deal.status === "waiting_desk";
  const zero = deal.buyerPlan === "aq_zero";
  const [offerId, setOfferId] = useState(deal.selectedOfferId ?? deal.offers.find((item) => item.shortlisted !== false)?.id ?? deal.offers[0]?.id ?? "");
  const [openId, setOpenId] = useState<string | null>(offerId || null);
  const [margin, setMargin] = useState(zero ? "0" : deal.marginPct != null ? String(deal.marginPct) : "8");
  const [plan, setPlan] = useState<BuyerPlan>(deal.buyerPlan ?? "aq_one");
  const [pending, start] = useTransition();
  const offer = deal.offers.find((item) => item.id === offerId) ?? deal.offers[0];
  const marginPct = zero ? 0 : Number(margin);
  const preview = offer && Number.isFinite(marginPct) ? buyerUnitPrice(offer.unitPrice, marginPct) : null;
  const priceText = preview != null && offer ? money(preview, offer.currency) : "";
  const generated = useMemo(() => (offer && priceText ? indicationDraftText({ ...deal, selectedOfferId: offer.id }, template, priceText) : ""), [deal, offer, priceText, template]);
  const savedDraft = deal.indicationDraft?.text ?? "";
  const [draft, setDraft] = useState(savedDraft || generated);
  const [draftEdited, setDraftEdited] = useState(Boolean(savedDraft) && savedDraft !== generated);

  const applyGenerated = (next: string) => {
    if (draftEdited && draft.trim() && draft.trim() !== next.trim()) {
      const replace = window.confirm("The price in the draft has changed. Replace your edits with the new draft?");
      if (!replace) return;
    }
    setDraft(next);
    setDraftEdited(false);
  };

  const choose = (item: DeskOffer) => {
    if (item.shortlisted === false) {
      toast.error("Add this supplier to the shortlist first.");
      return;
    }
    const nextPrice = buyerUnitPrice(item.unitPrice, zero ? 0 : Number(margin));
    const nextText = indicationDraftText({ ...deal, selectedOfferId: item.id }, template, money(nextPrice, item.currency));
    setOfferId(item.id);
    applyGenerated(nextText);
  };

  const onMargin = (value: string) => {
    setMargin(value);
    if (!offer) return;
    const pct = Number(value);
    if (!Number.isFinite(pct)) return;
    const nextText = indicationDraftText({ ...deal, selectedOfferId: offer.id }, template, money(buyerUnitPrice(offer.unitPrice, pct), offer.currency));
    applyGenerated(nextText);
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-[14px] font-semibold text-ink">Supplier quotes</h2>
            <p className="text-[12.5px] text-mid">{`${deal.offers.length} ${deal.offers.length === 1 ? "quote" : "quotes"} on ${displayRfqCode(deal.requestId)}. The first three start on the shortlist. You can add or remove any of them.`}</p>
          </div>
          <label className="text-[12px] font-semibold text-mid">
            Buyer plan
            <select
              className={`${input} ml-2`}
              value={plan}
              disabled={pending}
              onChange={(event) => {
                const next = event.target.value as BuyerPlan;
                setPlan(next);
                start(async () => {
                  const result = await setBuyerPlanAction({ id: deal.id, plan: next });
                  if (!result.ok) {
                    toast.error(result.message);
                    setPlan(deal.buyerPlan ?? "aq_one");
                    return;
                  }
                  toast.success(next === "aq_zero" ? "AQ Zero: margin locked, indication skipped." : "Buyer plan saved on this inquiry.");
                  router.refresh();
                });
              }}
            >
              <option value="aq_one">AQ ONE</option>
              <option value="aq_zero">AQ Zero</option>
              <option value="aq_analytics">AQ Analytics</option>
            </select>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-[13px]">
            <thead className="border-b border-border bg-s2/60 text-[11px] uppercase tracking-wide text-dim">
              <tr>
                <th className="px-3 py-2 font-semibold">Supplier</th>
                <th className="px-3 py-2 font-semibold">Product</th>
                <th className="px-3 py-2 font-semibold">Quantity</th>
                <th className="px-3 py-2 font-semibold">Price</th>
                <th className="px-3 py-2 font-semibold">Enquiry ID</th>
                <th className="px-3 py-2 font-semibold">Buyer</th>
                <th className="px-3 py-2 font-semibold">Channel</th>
                <th className="px-3 py-2 font-semibold">Received</th>
                <th className="px-3 py-2 font-semibold">Shortlist</th>
              </tr>
            </thead>
            <tbody>
              {deal.offers.map((item) => {
                const on = item.shortlisted !== false;
                const selected = item.id === offerId;
                const open = openId === item.id;
                return (
                  <QuoteRows
                    key={item.id}
                    deal={deal}
                    item={item}
                    on={on}
                    selected={selected}
                    open={open}
                    waiting={waiting}
                    pending={pending}
                    onOpen={() => setOpenId(open ? null : item.id)}
                    onChoose={() => choose(item)}
                    onToggle={() => {
                      start(async () => {
                        const result = await setOfferShortlistAction({ id: deal.id, offerId: item.id, shortlisted: !on });
                        if (!result.ok) {
                          toast.error(result.message);
                          return;
                        }
                        toast.success(!on ? `${item.supplierName} is on the shortlist.` : `${item.supplierName} was removed from the shortlist.`);
                        router.refresh();
                      });
                    }}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {waiting ? (
        <section className="rounded-2xl border border-border bg-white px-4 py-4">
          {zero ? (
            <>
              <p className="text-[13.5px] text-ink">AQ Zero uses the supplier price. The margin is locked at 0% and no indication is sent.</p>
              <p className="mt-2 text-[13.5px] text-ink">
                Buyer price <span className="font-semibold">{preview != null && offer ? `${money(preview, offer.currency)} / MT` : "—"}</span>
              </p>
              <button
                type="button"
                className={`${btnPrimary} mt-4`}
                disabled={pending || !offer || offer.shortlisted === false}
                onClick={() => {
                  start(async () => {
                    const result = await continueWithoutIndicationAction({ id: deal.id, offerId });
                    if (!result.ok) {
                      toast.error(result.message);
                      return;
                    }
                    toast.success("Indication skipped. Continue on the firm offer when the terms are ready.");
                    router.refresh();
                  });
                }}
              >
                Continue without an indication
              </button>
            </>
          ) : (
            <>
              <label className={label} htmlFor="margin">
                Your margin %
              </label>
              <input id="margin" inputMode="decimal" value={margin} onChange={(event) => onMargin(event.target.value)} className={`${input} mt-1 max-w-[8rem]`} />
              <p className="mt-2 text-[13.5px] text-ink">
                Buyer sees <span className="font-semibold">{preview != null && offer ? `${money(preview, offer.currency)} / MT` : "—"}</span>
              </p>
              <label className={`${label} mt-4`} htmlFor="indication">
                Indication to the buyer
              </label>
              <textarea
                id="indication"
                className={`${textarea} mt-1 font-serif`}
                rows={12}
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setDraftEdited(true);
                }}
              />
              <p className="mt-1 text-[12px] text-mid">Nothing is sent until you press Send indication. The text above is exactly what the buyer receives.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={btnSecondary}
                  disabled={pending || !draft.trim()}
                  onClick={() => {
                    start(async () => {
                      const result = await saveIndicationDraftAction({ id: deal.id, offerId, marginPct, text: draft });
                      if (!result.ok) {
                        toast.error(result.message);
                        return;
                      }
                      toast.success("Draft saved.");
                      router.refresh();
                    });
                  }}
                >
                  Save draft
                </button>
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={pending || !draft.trim() || !offer || offer.shortlisted === false}
                  onClick={() => {
                    start(async () => {
                      const result = await confirmIndicationAction({ id: deal.id, offerId, marginPct, text: draft });
                      if (!result.ok) {
                        toast.error(result.message);
                        return;
                      }
                      toast.success("Indication sent. The buyer thread has the exact text.");
                      router.refresh();
                    });
                  }}
                >
                  Send indication
                </button>
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="rounded-2xl border border-border bg-white px-4 py-3 text-[13.5px]">
          <p>
            Indication <span className="font-semibold">{deal.buyerPrice != null ? `${money(deal.buyerPrice, deal.currency)} / MT` : "—"}</span>
            {deal.marginPct != null ? ` (supplier + ${deal.marginPct}%)` : ""}
          </p>
          {deal.indicationDraft?.text ? <pre className="mt-3 whitespace-pre-wrap font-serif text-[13px] text-ink">{deal.indicationDraft.text}</pre> : null}
        </section>
      )}
    </div>
  );
}

function QuoteRows({
  deal,
  item,
  on,
  selected,
  open,
  waiting,
  pending,
  onOpen,
  onChoose,
  onToggle,
}: {
  deal: DeskDeal;
  item: DeskOffer;
  on: boolean;
  selected: boolean;
  open: boolean;
  waiting: boolean;
  pending: boolean;
  onOpen: () => void;
  onChoose: () => void;
  onToggle: () => void;
}) {
  const [channel, setChannel] = useState<OfferChannel>(channelOf(item));
  const [text, setText] = useState("");
  const [docName, setDocName] = useState("");
  const [docKind, setDocKind] = useState<(typeof CHECKS)[number]["kind"]>("coa");
  const [localPending, start] = useTransition();
  const router = useRouter();
  const docs = item.documents ?? {};
  const received = (kind: (typeof CHECKS)[number]["kind"]) => (kind === "photos" ? (docs.photos?.length ? docs.photos : null) : docs[kind] ? [docs[kind]] : null);

  return (
    <>
      <tr className={`border-b border-border ${selected ? "bg-blue-light/40" : ""}`}>
        <td className="px-3 py-2">
          <button type="button" className="font-semibold text-ink" onClick={onOpen}>
            {open ? "▾" : "▸"} {item.supplierName}
          </button>
        </td>
        <td className="px-3 py-2 text-mid">{item.product || deal.product}</td>
        <td className="px-3 py-2 text-mid">{item.quantityMt ?? deal.quantityMt ?? "—"}</td>
        <td className="px-3 py-2 font-mono text-ink">{money(item.unitPrice, item.currency)}</td>
        <td className="px-3 py-2 font-mono text-[12px] text-mid">{displayRfqCode(deal.requestId)}</td>
        <td className="px-3 py-2 text-mid">{deal.buyerName || deal.buyerCompany || "—"}</td>
        <td className="px-3 py-2 text-mid">{CHANNEL[channelOf(item)]}</td>
        <td className="px-3 py-2 text-mid">{item.receivedAt ? when(item.receivedAt) : "—"}</td>
        <td className="px-3 py-2">
          <div className="flex flex-wrap gap-2">
            {waiting && on ? (
              <button type="button" className="text-[12px] font-semibold text-blue" onClick={onChoose}>
                {selected ? "Selected" : "Use"}
              </button>
            ) : null}
            {waiting ? (
              <button type="button" className="text-[12px] font-semibold text-mid" disabled={pending} onClick={onToggle}>
                {on ? "Remove" : "Add"}
              </button>
            ) : (
              <span className="text-[12px] text-dim">{on ? "On shortlist" : "Not shortlisted"}</span>
            )}
          </div>
        </td>
      </tr>
      {open ? (
        <tr className="border-b border-border bg-s2/30">
          <td colSpan={9} className="px-4 py-3">
            <div className="grid gap-4 lg:grid-cols-3">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wide text-dim">Quote</p>
                <p className="mt-1 whitespace-pre-wrap text-[13px] text-ink">{item.notes || "No extra terms on this quote."}</p>
                <p className="mt-2 text-[12.5px] text-mid">{[item.incoterm, item.loadPort, item.destination].filter(Boolean).join(" · ") || "No route on the quote."}</p>
              </div>
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wide text-dim">Documents</p>
                <ul className="mt-1 space-y-1 text-[13px]">
                  {CHECKS.map((check) => {
                    const files = received(check.kind);
                    return (
                      <li key={check.kind} className="flex items-start justify-between gap-2">
                        <span>
                          {check.label}: {files ? <span className="text-ink">Received</span> : <span className="text-mid">Missing</span>}
                          {files?.map((file) =>
                            file.href ? (
                              <a key={file.filename} href={file.href} className="ml-2 text-blue no-underline hover:underline">
                                {file.filename}
                              </a>
                            ) : (
                              <span key={file.filename} className="ml-2 text-ink">
                                {file.filename}
                              </span>
                            ),
                          )}
                        </span>
                        {!files ? (
                          <button type="button" className="shrink-0 text-[12px] font-semibold text-blue" onClick={() => setText(`Please send the ${check.label} for ${item.product || deal.product}, enquiry ${displayRfqCode(deal.requestId)}.`)}>
                            Request
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-2 flex flex-wrap gap-2">
                  <select className={input} value={docKind} onChange={(event) => setDocKind(event.target.value as typeof docKind)}>
                    {CHECKS.map((check) => (
                      <option key={check.kind} value={check.kind}>
                        {check.label}
                      </option>
                    ))}
                  </select>
                  <input className={input} placeholder="File name" value={docName} onChange={(event) => setDocName(event.target.value)} />
                  <button
                    type="button"
                    className={btnSecondary}
                    disabled={localPending || !docName.trim()}
                    onClick={() => {
                      start(async () => {
                        const result = await markSupplierDocumentAction({ id: deal.id, offerId: item.id, kind: docKind, filename: docName, href: "" });
                        if (!result.ok) {
                          toast.error(result.message);
                          return;
                        }
                        setDocName("");
                        toast.success("Marked received.");
                        router.refresh();
                      });
                    }}
                  >
                    Mark received
                  </button>
                </div>
              </div>
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wide text-dim">Messages with this supplier</p>
                <ul className="mt-1 max-h-40 space-y-2 overflow-y-auto">
                  {(item.messages ?? []).length === 0 ? <li className="text-[13px] text-mid">No messages on this trade yet.</li> : null}
                  {(item.messages ?? []).map((msg) => (
                    <li key={msg.id} className="text-[12.5px]">
                      <span className="text-dim">{when(msg.at)} · {CHANNEL[msg.channel]} · {msg.actor || msg.from}</span>
                      <p className="whitespace-pre-wrap text-ink">{msg.text}</p>
                    </li>
                  ))}
                </ul>
                <label className={`${label} mt-2`} htmlFor={`ch-${item.id}`}>
                  Channel
                </label>
                <select id={`ch-${item.id}`} className={`${input} mt-1`} value={channel} onChange={(event) => setChannel(event.target.value as OfferChannel)}>
                  <option value="email">Email</option>
                  <option value="wechat">WeChat</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
                <textarea className={`${textarea} mt-2`} rows={3} value={text} onChange={(event) => setText(event.target.value)} placeholder="Message this supplier about this trade" />
                <button
                  type="button"
                  className={`${btnPrimary} mt-2`}
                  disabled={localPending || !text.trim()}
                  onClick={() => {
                    start(async () => {
                      const result = await messageSupplierAction({ id: deal.id, offerId: item.id, channel, text });
                      if (!result.ok) {
                        toast.error(result.message);
                        return;
                      }
                      setText("");
                      toast.success("Saved on this trade.");
                      router.refresh();
                    });
                  }}
                >
                  Message supplier
                </button>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
