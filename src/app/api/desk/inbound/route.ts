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
  const result = await recordBuyerInbound({
    phone: typeof body?.phone === "string" ? body.phone : typeof body?.from === "string" ? body.from : "",
    requestId: typeof body?.requestId === "string" ? body.requestId : undefined,
    text: typeof body?.text === "string" ? body.text : typeof body?.body === "string" ? body.body : "",
  });
  if ("error" in result) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  if ("event" in result) return NextResponse.json({ ok: true, event: "chat" });
  const firm = result.status === "firm_interest";
  const hasTerms = Boolean(result.execution?.packing || result.execution?.paymentTerms);
  // Firm offer PDFs only after the AI agent has saved execution terms.
  const buyerDocs =
    firm && hasTerms
      ? {
          firm_offer: buyerDocumentFromDeal(result, "firm_offer"),
          proforma: buyerDocumentFromDeal(result, "proforma"),
          sales_contract: buyerDocumentFromDeal(result, "sales_contract"),
        }
      : null;
  return NextResponse.json({
    ok: true,
    dealId: result.id,
    requestId: result.requestId,
    status: result.status,
    event: firm ? "firm_interest" : "negotiating",
    buyerPhone: result.buyerPhone,
    buyerPrice: result.buyerPrice,
    start_firm_order_agent: firm && !hasTerms,
    buyer_documents: buyerDocs,
  });
}
