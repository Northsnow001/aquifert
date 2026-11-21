import { NextResponse, type NextRequest } from "next/server";
import { deskHitlAuthorized } from "@/lib/desk-hitl/n8n-auth";
import { parseWechatFollow } from "@/lib/trade/invite-rules";
import { linkSupplierWechatFollow } from "@/lib/trade/store";

export const runtime = "nodejs";

/**
 * WF2 subscribe / SCAN. n8n POSTs after it parses the QR scene.
 * Body: { openid, email?, eventKey?, event? }
 */
export async function POST(req: NextRequest) {
  if (!deskHitlAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  const parsed = parseWechatFollow({
    openid: body.openid ?? body.wechatOpenId ?? body.fromusername,
    email: body.email,
    eventKey: body.eventKey ?? body.eventkey ?? body.EventKey,
    event: body.event,
  });
  if (!parsed.linked) {
    return NextResponse.json({ ok: false, linked: false, error: "Need a WeChat OpenID and the invite email from the QR scene." }, { status: 400 });
  }
  try {
    const result = await linkSupplierWechatFollow({
      openid: parsed.openid,
      email: parsed.email,
      joinedAt: typeof body.joined_at === "string" ? body.joined_at : undefined,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, unmatched: "unmatched" in result, error: result.error }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      linked: true,
      id: result.supplier.id,
      code: result.supplier.code,
      companyName: result.supplier.companyName,
      onboardingStatus: result.supplier.onboardingStatus,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Link failed" }, { status: 500 });
  }
}
