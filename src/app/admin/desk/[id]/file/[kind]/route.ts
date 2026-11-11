import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin-access";
import { getDeskDeal } from "@/lib/desk-hitl/store";
import { buyerDocumentFromDeal, salesContractFromPi, supplierDocumentFromDeal } from "@/lib/firm-order/from-deal";
import { buildFirmOrderPdf, firmOrderFilename } from "@/lib/firm-order/pdf";
import { TRADE_DOCUMENTS, type TradeDocument } from "@/lib/firm-order/types";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

function isKind(value: string): value is TradeDocument {
  return (TRADE_DOCUMENTS as readonly string[]).includes(value);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; kind: string }> }) {
  const user = await getSession();
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, kind } = await params;
  if (!isKind(kind)) return NextResponse.json({ error: "Unknown document." }, { status: 404 });
  const deal = await getDeskDeal(id);
  if (!deal) return NextResponse.json({ error: "Deal not found." }, { status: 404 });

  const order =
    kind === "proforma"
      ? (deal.pi?.order ?? buyerDocumentFromDeal(deal, "proforma"))
      : kind === "firm_offer"
        ? buyerDocumentFromDeal(deal, "firm_offer")
        : kind === "sales_contract"
          ? deal.pi?.order
            ? salesContractFromPi(deal.pi.order)
            : buyerDocumentFromDeal(deal, "sales_contract")
          : kind === "purchase_order" || kind === "purchase_contract" || kind === "documentary_instructions"
            ? supplierDocumentFromDeal(deal, kind)
            : null;
  if (!order) return NextResponse.json({ error: "That document is not ready yet." }, { status: 404 });

  const bytes = await buildFirmOrderPdf(order);
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${firmOrderFilename(order)}"`,
      "Cache-Control": "no-store",
    },
  });
}
