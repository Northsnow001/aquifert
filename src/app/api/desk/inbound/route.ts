import { NextResponse, type NextRequest } from "next/server";
import { deskHitlAuthorized } from "@/lib/desk-hitl/n8n-auth";
import { recordBuyerInbound } from "@/lib/desk-hitl/store";
import { buyerDocumentFromDeal } from "@/lib/firm-order/from-deal";

export const runtime = "nodejs";

/** n8n WhatsApp inbound: POST { phone, text, requestId? }. */
export async function POST(req: NextRequest) {
  if (!deskHitlAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const deal = await recordBuyerInbound({
    phone: typeof body?.phone === "string" ? body.phone : typeof body?.from === "string" ? body.from : "",
    requestId: typeof body?.requestId === "string" ? body.requestId : undefined,
    text: typeof body?.text === "string" ? body.text : typeof body?.body === "string" ? body.body : "",
  });
  if ("error" in deal) return NextResponse.json({ ok: false, error: deal.error }, { status: 400 });
  const buyerDocs =
    deal.status === "firm_interest"
      ? {
          proforma: buyerDocumentFromDeal(deal, "proforma"),
          sales_contract: buyerDocumentFromDeal(deal, "sales_contract"),
        }
      : null;
  return NextResponse.json({
    ok: true,
    dealId: deal.id,
    requestId: deal.requestId,
    status: deal.status,
    event: deal.status === "firm_interest" ? "firm_interest" : "negotiating",
    buyerPhone: deal.buyerPhone,
    buyerPrice: deal.buyerPrice,
    buyer_documents: buyerDocs,
  });
}
