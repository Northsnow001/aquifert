"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sendSalesContractAndSupplierPackAction } from "@/app/admin/desk/actions";
import { btnPrimary } from "@/components/admin/ui";
import { selectedOffer } from "@/lib/desk-hitl/logic";
import type { DeskDeal } from "@/lib/desk-hitl/types";

export function AfterPayment({ deal }: { deal: DeskDeal }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (deal.pi?.status !== "sent") return null;
  const offer = selectedOffer(deal);
  const contractSent = deal.salesContract?.status === "sent";
  const packSent = Boolean(deal.supplierPackSentAt);

  const send = () => {
    start(async () => {
      const result = await sendSalesContractAndSupplierPackAction({ id: deal.id });
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
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-[14.5px] font-semibold text-ink">After payment (offline)</h2>
        <p className="mt-0.5 text-[12.5px] text-mid">
          One click emails the sales contract to the buyer at the PI price, and sends the purchase order pack to{" "}
          {offer?.supplierName || "the selected supplier"} at supplier cost. The buyer never sees the supplier or 205.
        </p>
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <div className="space-y-3 text-[13.5px] text-ink">
          <p>
            {contractSent
              ? `Sales contract sent to ${deal.salesContract?.sentTo}.`
              : "Sales contract is ready from the approved proforma."}
          </p>
          <p>
            {packSent
              ? `Supplier pack issued${offer ? ` to ${offer.supplierName}` : ""}.`
              : "Supplier pack: PO, purchase contract, documentary instructions."}
          </p>
          <button type="button" disabled={pending} onClick={send} className={btnPrimary}>
            {pending ? "Sending…" : contractSent && packSent ? "Send again" : "Send sales contract & supplier pack"}
          </button>
        </div>
        <iframe
          title="Sales contract preview"
          src={`/admin/desk/${deal.id}/sales-contract`}
          className="h-[28rem] w-full rounded-xl border border-border bg-white"
        />
      </div>
    </section>
  );
}
