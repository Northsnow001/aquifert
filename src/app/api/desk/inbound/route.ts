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
  const buyerDocs =
    result.status === "firm_interest"
      ? {
          proforma: buyerDocumentFromDeal(result, "proforma"),
          sales_contract: buyerDocumentFromDeal(result, "sales_contract"),
        }
      : null;
  return NextResponse.json({
    ok: true,
    dealId: result.id,
    requestId: result.requestId,
    status: result.status,
    event: result.status === "firm_interest" ? "firm_interest" : "negotiating",
    buyerPhone: result.buyerPhone,
    buyerPrice: result.buyerPrice,
    buyer_documents: buyerDocs,
  });
}
