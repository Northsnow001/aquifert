import { NextResponse, type NextRequest } from "next/server";
import { deskHitlAuthorized } from "@/lib/desk-hitl/n8n-auth";
import { markWhatsAppSent } from "@/lib/desk-hitl/store";

export const runtime = "nodejs";

/** n8n after Twilio send: POST { dealId, messageId }. */
export async function POST(req: NextRequest) {
  if (!deskHitlAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const dealId = typeof body?.dealId === "string" ? body.dealId : "";
  const messageId = typeof body?.messageId === "string" ? body.messageId : "";
  const deal = await markWhatsAppSent(dealId, messageId);
  if ("error" in deal) return NextResponse.json({ ok: false, error: deal.error }, { status: 400 });
  return NextResponse.json({ ok: true, dealId: deal.id });
}
