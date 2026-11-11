import { NextResponse, type NextRequest } from "next/server";
import { deskHitlAuthorized } from "@/lib/desk-hitl/n8n-auth";
import { submitPiForReview } from "@/lib/desk-hitl/store";

export const runtime = "nodejs";

/** n8n WF11: POST proforma JSON. Parks it on the desk deal. Does not email the buyer. */
export async function POST(req: NextRequest) {
  if (!deskHitlAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const result = await submitPiForReview(body);
  if ("error" in result) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  return NextResponse.json({
    ok: true,
    event: "pi_review",
    dealId: result.id,
    requestId: result.requestId,
    deskPath: `/admin/desk/${result.id}`,
  });
}
