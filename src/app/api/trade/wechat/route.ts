import { after, NextResponse, type NextRequest } from "next/server";
import { deskUsesAgent, forwardToN8n, n8nWechatInboundUrl } from "@/lib/desk-engine";
import { wechatSignatureMatches } from "@/lib/wechat/inbound";
import { handleWechatXml } from "@/lib/wechat/receive";

export const runtime = "nodejs";
export const maxDuration = 60;

function serverToken() {
  return process.env.WECHAT_TOKEN?.trim() || "";
}

function signed(req: NextRequest) {
  const token = serverToken();
  const signature = req.nextUrl.searchParams.get("signature") || "";
  const timestamp = req.nextUrl.searchParams.get("timestamp") || "";
  const nonce = req.nextUrl.searchParams.get("nonce") || "";
  return Boolean(token) && wechatSignatureMatches({ token, timestamp, nonce, signature });
}

function plain(body: string, status = 200) {
  return new NextResponse(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

/** WeChat Official Account server URL. Point MP → https://www.aquifert.com/api/trade/wechat */
export async function GET(req: NextRequest) {
  if (!serverToken()) return plain("WECHAT_TOKEN is not set", 503);
  if (!signed(req)) return plain("invalid signature", 403);
  return plain(req.nextUrl.searchParams.get("echostr") || "");
}

export async function POST(req: NextRequest) {
  if (!serverToken()) return plain("success");
  if (!signed(req)) return plain("invalid signature", 403);
  const xml = await req.text();
  after(async () => {
    try {
      if (deskUsesAgent("wechat")) await handleWechatXml(xml);
      else await forwardToN8n(n8nWechatInboundUrl(), xml, "text/xml; charset=utf-8");
    } catch (error) {
      console.error("[wechat inbound]", error instanceof Error ? error.message : error);
    }
  });
  return plain("success");
}
