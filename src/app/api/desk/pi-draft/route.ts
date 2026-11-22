import { NextResponse, type NextRequest } from "next/server";
import { deskHitlAuthorized } from "@/lib/desk-hitl/n8n-auth";
import { ingestDeskPiInbound } from "@/lib/desk-hitl/store";

export const runtime = "nodejs";

/**
 * n8n WF11 — Gmail watch on the desk inbox.
 * POST either the raw mail { from, subject, text } or a proforma JSON.
 * YES parks a PI on the live desk deal for Matt. Negotiate hands the thread to Matt.
 * Does not email the buyer.
 */
export async function POST(req: NextRequest) {
  if (!deskHitlAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const result = await ingestDeskPiInbound(body);
  if ("error" in result) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  if ("event" in result && result.event === "ignored") {
    return NextResponse.json({ ok: true, event: "ignored" });
  }
  if ("event" in result && result.event === "negotiating") {
    return NextResponse.json({
      ok: true,
      event: "negotiating",
      dealId: result.dealId,
      requestId: result.requestId,
      deskPath: result.dealId ? `/admin/desk/${result.dealId}` : "/admin/desk/negotiation",
    });
  }
  const deal = result as Exclude<typeof result, { error: string } | { event: "ignored" | "negotiating" }>;
  return NextResponse.json({
    ok: true,
    event: deal.pi?.status === "review" ? "pi_review" : "logged",
    dealId: deal.id,
    requestId: deal.requestId,
    deskPath: `/admin/desk/${deal.id}`,
  });
}
