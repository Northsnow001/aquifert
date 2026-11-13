import { NextResponse, type NextRequest } from "next/server";
import { deskHitlAuthorized } from "@/lib/desk-hitl/n8n-auth";
import { saveFirmTerms } from "@/lib/desk-hitl/store";
import { buyerDocumentFromDeal, firmOfferDraftFromDeal } from "@/lib/firm-order/from-deal";

export const runtime = "nodejs";

/** n8n firm-order agent: POST confirmed WhatsApp terms. Used by FO / PI / contracts. */
export async function POST(req: NextRequest) {
  if (!deskHitlAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const result = await saveFirmTerms(body);
  if ("error" in result) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  return NextResponse.json({
    ok: true,
    event: "firm_terms",
    dealId: result.id,
    requestId: result.requestId,
    execution: result.execution,
    firm_offer: firmOfferDraftFromDeal(result) ?? buyerDocumentFromDeal(result, "firm_offer"),
    firmOfferStatus: result.firmOffer?.status ?? null,
    proforma: buyerDocumentFromDeal(result, "proforma"),
    sales_contract: buyerDocumentFromDeal(result, "sales_contract"),
  });
}
