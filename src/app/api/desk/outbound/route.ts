import { NextResponse, type NextRequest } from "next/server";
import { deskHitlAuthorized } from "@/lib/desk-hitl/n8n-auth";
import { queuedWhatsApp } from "@/lib/desk-hitl/store";

export const runtime = "nodejs";

/** n8n poll: queued WhatsApp texts Matt (or the indication) wants sent to the buyer. */
export async function GET(req: NextRequest) {
  if (!deskHitlAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const messages = await queuedWhatsApp();
  return NextResponse.json({ ok: true, messages });
}
