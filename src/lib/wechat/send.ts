import "server-only";

import { wechatAccessToken, wechatAccessTokenRetry } from "@/lib/wechat/token";

const SEND = "https://api.weixin.qq.com/cgi-bin/message/custom/send";

async function post(token: string, openid: string, text: string) {
  const res = await fetch(`${SEND}?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ touser: openid, msgtype: "text", text: { content: text } }),
    signal: AbortSignal.timeout(12_000),
  });
  return (await res.json().catch(() => null)) as { errcode?: number; errmsg?: string } | null;
}

export async function sendWechatText(openid: string, text: string) {
  const to = openid.trim();
  const body = text.trim();
  if (!to || !body) return { ok: false as const, error: "Missing OpenID or message." };
  let token = await wechatAccessToken();
  let result = await post(token.token, to, body);
  if (result?.errcode === 40001 || result?.errcode === 42001) {
    token = await wechatAccessTokenRetry();
    result = await post(token.token, to, body);
  }
  if (result?.errcode && result.errcode !== 0) {
    return { ok: false as const, error: result.errmsg || `WeChat send failed (${result.errcode}).` };
  }
  return { ok: true as const };
}
