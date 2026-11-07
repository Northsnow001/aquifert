import { NextResponse, type NextRequest } from "next/server";
import { deskHitlAuthorized } from "@/lib/desk-hitl/n8n-auth";
import { upsertShortlist } from "@/lib/desk-hitl/store";

export const runtime = "nodejs";

/**
 * n8n WF8 True branch: POST the first 3 offers.
 * Auth: x-desk-hitl-secret or Bearer = DESK_HITL_SECRET (or FIRM_ORDER_PDF_SECRET).
 */
export async function POST(req: NextRequest) {
  if (!deskHitlAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const deal = await upsertShortlist(body);
  if ("error" in deal) return NextResponse.json({ ok: false, error: deal.error }, { status: 400 });
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://aquifert.com").replace(/\/$/, "");
  return NextResponse.json({
    ok: true,
    dealId: deal.id,
    status: deal.status,
    requestId: deal.requestId,
    adminUrl: `${site}/admin/desk/${deal.id}`,
    offerCount: deal.offers.length,
  });
}
