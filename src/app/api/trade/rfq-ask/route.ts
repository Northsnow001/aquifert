import { NextResponse, type NextRequest } from "next/server";
import { deskHitlAuthorized } from "@/lib/desk-hitl/n8n-auth";
import { recordWorkflowRfqAsk } from "@/lib/trade/store";

export const runtime = "nodejs";

/**
 * n8n WF7 after a WeChat fan-out, and WF2 after a supplier quote.
 * POST { requestId | rfqId, supplierId | wechatOpenId, status, error?, log? }
 */
export async function POST(req: NextRequest) {
  if (!deskHitlAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  const status = typeof body.status === "string" ? body.status : "";
  const result = await recordWorkflowRfqAsk({
    requestId: typeof body.requestId === "string" ? body.requestId : typeof body.code === "string" ? body.code : "",
    rfqId: typeof body.rfqId === "string" ? body.rfqId : "",
    supplierId: typeof body.supplierId === "string" ? body.supplierId : "",
    wechatOpenId: typeof body.wechatOpenId === "string" ? body.wechatOpenId : typeof body.openid === "string" ? body.openid : "",
    status,
    error: typeof body.error === "string" ? body.error : "",
    log: body.log !== false,
  });
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
