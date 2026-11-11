import { selectedOffer } from "@/lib/desk-hitl/logic";
import type { DeskDeal } from "@/lib/desk-hitl/types";

export type DealDocRow = {
  id: string;
  audience: "buyer" | "supplier";
  title: string;
  kind: string;
  status: string;
  to: string | null;
  at: string | null;
  href: string;
};

export function dealDocumentRows(deal: DeskDeal): DealDocRow[] {
  const offer = selectedOffer(deal);
  const buyer: DealDocRow[] = [
    {
      id: "firm_offer",
      audience: "buyer",
      title: "Firm offer",
      kind: "firm_offer",
      status: deal.status === "waiting_desk" ? "Not sent" : "Issued with indication",
      to: deal.buyerPhone || null,
      at: null,
      href: `/admin/desk/${deal.id}/file/firm_offer`,
    },
    {
      id: "proforma",
      audience: "buyer",
      title: "Proforma invoice",
      kind: "proforma",
      status: deal.pi?.status === "sent" ? "Emailed" : deal.pi ? "On desk" : "Not on file",
      to: deal.pi?.sentTo ?? null,
      at: deal.pi?.sentAt ?? deal.pi?.updatedAt ?? null,
      href: `/admin/desk/${deal.id}/file/proforma`,
    },
    {
      id: "sales_contract",
      audience: "buyer",
      title: "Sales contract",
      kind: "sales_contract",
      status: deal.salesContract?.status === "sent" ? "Emailed" : deal.pi?.status === "sent" ? "Ready after payment" : "Waiting for PI",
      to: deal.salesContract?.sentTo ?? null,
      at: deal.salesContract?.sentAt ?? null,
      href: `/admin/desk/${deal.id}/file/sales_contract`,
    },
  ];
  const supplier: DealDocRow[] = [
    {
      id: "purchase_order",
      audience: "supplier",
      title: "Purchase order",
      kind: "purchase_order",
      status: deal.supplierPackSentAt ? "Queued to supplier" : offer ? "Ready after payment" : "No supplier selected",
      to: offer?.supplierName ?? null,
      at: deal.supplierPackSentAt ?? null,
      href: `/admin/desk/${deal.id}/file/purchase_order`,
    },
    {
      id: "purchase_contract",
      audience: "supplier",
      title: "Purchase contract",
      kind: "purchase_contract",
      status: deal.supplierPackSentAt ? "Queued to supplier" : offer ? "Ready after payment" : "No supplier selected",
      to: offer?.supplierName ?? null,
      at: deal.supplierPackSentAt ?? null,
      href: `/admin/desk/${deal.id}/file/purchase_contract`,
    },
    {
      id: "documentary_instructions",
      audience: "supplier",
      title: "Documentary instructions",
      kind: "documentary_instructions",
      status: deal.supplierPackSentAt ? "Queued to supplier" : offer ? "Ready after payment" : "No supplier selected",
      to: offer?.supplierName ?? null,
      at: deal.supplierPackSentAt ?? null,
      href: `/admin/desk/${deal.id}/file/documentary_instructions`,
    },
  ];
  return [...buyer, ...supplier];
}
