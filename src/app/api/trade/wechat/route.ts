import { after, NextResponse, type NextRequest } from "next/server";
import { wechatSignatureMatches } from "@/lib/wechat/inbound";
import { handleWechatXml } from "@/lib/wechat/receive";

export const runtime = "nodejs";

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
      await handleWechatXml(xml);
    } catch {
      // Always ack so WeChat does not retry the same event.
    }
  });
  return plain("success");
}
