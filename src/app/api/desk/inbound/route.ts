import { NextResponse, type NextRequest } from "next/server";
import { deskHitlAuthorized } from "@/lib/desk-hitl/n8n-auth";
import { recordBuyerInbound } from "@/lib/desk-hitl/store";

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
  return NextResponse.json({
    ok: true,
    dealId: deal.id,
    status: deal.status,
    event: deal.status === "firm_interest" ? "firm_interest" : "negotiating",
  });
}
