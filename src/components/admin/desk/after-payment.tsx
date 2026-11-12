"use client";

import { SalesContractEditor } from "@/components/admin/desk/sales-contract-editor";
import type { DeskDeal } from "@/lib/desk-hitl/types";

export function AfterPayment({ deal }: { deal: DeskDeal }) {
  if (deal.pi?.status !== "sent") return null;
  return <SalesContractEditor deal={deal} />;
}
