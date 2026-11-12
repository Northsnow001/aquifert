"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveSalesContractDraftAction, sendSalesContractAndSupplierPackAction } from "@/app/admin/desk/actions";
import { btnPrimary, btnSecondary, input, label, textarea } from "@/components/admin/ui";
import { valuesFromPi, type PiEditorValues } from "@/lib/desk-hitl/pi";
import { salesContractFromPi } from "@/lib/firm-order/from-deal";
import { AQUIFERT_BANK } from "@/lib/firm-order/types";
import { selectedOffer } from "@/lib/desk-hitl/logic";
import type { DeskDeal } from "@/lib/desk-hitl/types";

function Field({
  id,
  caption,
  value,
  onChange,
  type = "text",
}: {
  id: keyof PiEditorValues;
  caption: string;
  value: string;
  onChange: (id: keyof PiEditorValues, value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className={label} htmlFor={`sc-${id}`}>
        {caption}
      </label>
      <input id={`sc-${id}`} type={type} value={value} onChange={(e) => onChange(id, e.target.value)} className={`${input} mt-1`} />
    </div>
  );
}

export function SalesContractEditor({ deal }: { deal: DeskDeal }) {
  const pi = deal.pi;
  const router = useRouter();
  const [pending, start] = useTransition();
  const offer = selectedOffer(deal);
  const contract = deal.salesContract;
  const [values, setValues] = useState<PiEditorValues>(() =>
    valuesFromPi(contract?.order ?? salesContractFromPi(pi!.order)),
  );
  if (!pi || pi.status !== "sent") return null;

  const previewStamp = contract?.updatedAt || pi.updatedAt;
  const preview = `/admin/desk/${deal.id}/sales-contract?t=${encodeURIComponent(previewStamp)}`;
  const set = (id: keyof PiEditorValues, value: string) => setValues((prev) => ({ ...prev, [id]: value }));

  const save = () => {
    start(async () => {
      const result = await saveSalesContractDraftAction({ id: deal.id, values });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Sales contract saved. Preview updated.");
      router.refresh();
    });
  };

  const send = () => {
    start(async () => {
      const result = await sendSalesContractAndSupplierPackAction({ id: deal.id, values });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Sales contract emailed to the buyer. Supplier pack queued for n8n.");
      router.refresh();
    });
  };

  return (
    <section className="rounded-2xl border border-border bg-white">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-[14.5px] font-semibold text-ink">Sales contract</h2>
          <p className="mt-0.5 text-[12.5px] text-mid">
            {contract?.status === "sent"
              ? `Last emailed to ${contract.sentTo || "buyer"}. Edit and send again if needed.`
              : "Starts from the approved proforma. Edit the fields, save to refresh the PDF, then email the buyer. The supplier pack still goes at supplier cost."}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            contract?.status === "sent" ? "bg-[#eaf7ef] text-[#1f7a45]" : "bg-[#fff6e5] text-[#9a5b00]"
          }`}
        >
          {contract?.status === "sent" ? "Sent" : "For review"}
        </span>
      </div>

      <div className="grid gap-6 p-4 lg:grid-cols-2">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <fieldset className="space-y-3">
            <legend className="text-[12px] font-semibold uppercase tracking-wide text-dim">Buyer</legend>
            <Field id="buyerName" caption="Name" value={values.buyerName} onChange={set} />
            <Field id="buyerEmail" caption="Email (send to)" value={values.buyerEmail} onChange={set} type="email" />
            <Field id="buyerPhone" caption="WhatsApp / phone" value={values.buyerPhone} onChange={set} />
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="text-[12px] font-semibold uppercase tracking-wide text-dim">Line</legend>
            <Field id="product" caption="Product" value={values.product} onChange={set} />
            <div className="grid grid-cols-2 gap-3">
              <Field id="quantityMt" caption="Quantity MT" value={values.quantityMt} onChange={set} />
              <Field id="unitPrice" caption="Buyer USD / MT" value={values.unitPrice} onChange={set} />
            </div>
            <Field id="packing" caption="Packing" value={values.packing} onChange={set} />
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="text-[12px] font-semibold uppercase tracking-wide text-dim">Logistics</legend>
            <div className="grid grid-cols-2 gap-3">
              <Field id="incoterm" caption="Incoterm" value={values.incoterm} onChange={set} />
              <Field id="loadPort" caption="Load port" value={values.loadPort} onChange={set} />
            </div>
            <Field id="dischargePort" caption="Discharge / basis" value={values.dischargePort} onChange={set} />
            <Field id="origin" caption="Origin" value={values.origin} onChange={set} />
            <Field id="shipping" caption="Shipment window" value={values.shipping} onChange={set} />
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="text-[12px] font-semibold uppercase tracking-wide text-dim">Document</legend>
            <div className="grid grid-cols-2 gap-3">
              <Field id="invoiceNumber" caption="Contract reference" value={values.invoiceNumber} onChange={set} />
              <Field id="invoiceDate" caption="Contract date" value={values.invoiceDate} onChange={set} />
            </div>
            <div>
              <label className={label} htmlFor="sc-paymentTerms">
                Payment terms
              </label>
              <textarea
                id="sc-paymentTerms"
                rows={2}
                value={values.paymentTerms}
                onChange={(e) => set("paymentTerms", e.target.value)}
                className={`${textarea} mt-1`}
              />
            </div>
            <div>
              <label className={label} htmlFor="sc-additionalInformation">
                Additional clauses (on the PDF)
              </label>
              <textarea
                id="sc-additionalInformation"
                rows={4}
                value={values.additionalInformation}
                onChange={(e) => set("additionalInformation", e.target.value)}
                className={`${textarea} mt-1`}
              />
            </div>
            <p className="text-[12px] leading-relaxed text-dim">
              Buyer price only. Supplier name and cost never appear. PO pack to {offer?.supplierName || "the selected supplier"} still uses
              supplier cost. Bank block is fixed (Lloyds {AQUIFERT_BANK.iban}).
            </p>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className={btnSecondary}>
              {pending ? "Saving…" : "Save & refresh PDF"}
            </button>
            <button type="button" disabled={pending} onClick={send} className={btnPrimary}>
              {pending ? "Sending…" : contract?.status === "sent" ? "Send again" : "Send sales contract & supplier pack"}
            </button>
          </div>
        </form>
        <div className="min-h-[28rem]">
          <iframe title="Sales contract preview" src={preview} className="h-[40rem] w-full rounded-xl border border-border bg-white" />
        </div>
      </div>
    </section>
  );
}
