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
  const phone = typeof body?.phone === "string" ? body.phone : typeof body?.from === "string" ? body.from : "";
  const text = typeof body?.text === "string" ? body.text : typeof body?.body === "string" ? body.body : "";
  const result = await recordBuyerInbound({
    phone,
    requestId: typeof body?.requestId === "string" ? body.requestId : undefined,
    text,
  });
  if ("error" in result) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  const echo = { phone, text, body: text };
  if (!("status" in result)) {
    return NextResponse.json({ ok: true, event: result.event, dealId: result.dealId, requestId: result.requestId, ...echo });
  }
  const buyerDocs =
    result.status === "firm_interest"
      ? {
          firm_offer: buyerDocumentFromDeal(result, "firm_offer"),
          proforma: buyerDocumentFromDeal(result, "proforma"),
          sales_contract: buyerDocumentFromDeal(result, "sales_contract"),
        }
      : null;
  const collectingTerms = result.status === "firm_interest" && !result.execution?.confirmedAt;
  const event =
    collectingTerms ? "firm_interest" : result.status === "negotiating" ? "negotiating" : "chat";
  return NextResponse.json({
    ok: true,
    dealId: result.id,
    requestId: result.requestId,
    status: result.status,
    event,
    collectingTerms,
    buyerPhone: result.buyerPhone,
    buyerPrice: result.buyerPrice,
    buyer_documents: buyerDocs,
    ...echo,
  });
}
