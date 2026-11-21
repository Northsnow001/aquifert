import "server-only";

import { wechatAccessToken, wechatAccessTokenRetry } from "@/lib/wechat/token";

const CREATE = "https://api.weixin.qq.com/cgi-bin/qrcode/create";
const SHOW = "https://mp.weixin.qq.com/cgi-bin/showqrcode";

type QrBody = { ticket?: string; errcode?: number; errmsg?: string };

async function createWith(token: string, scene: string) {
  const res = await fetch(`${CREATE}?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action_name: "QR_LIMIT_STR_SCENE", action_info: { scene: { scene_str: scene } } }),
    signal: AbortSignal.timeout(12_000),
  });
  return (await res.json().catch(() => null)) as QrBody | null;
}

export async function wechatPermanentQr(scene: string) {
  let token = await wechatAccessToken();
  let body = await createWith(token.token, scene);
  if (body?.errcode === 40001 || body?.errcode === 42001) {
    token = await wechatAccessTokenRetry();
    body = await createWith(token.token, scene);
  }
  const ticket = body?.ticket?.trim() ?? "";
  if (!ticket) throw new Error(body?.errmsg || "WeChat did not return a QR ticket.");
  return { ticket, reusedToken: token.reused };
}

export async function wechatQrPng(ticket: string) {
  const res = await fetch(`${SHOW}?ticket=${encodeURIComponent(ticket)}`, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`WeChat QR image failed (${res.status}).`);
  return Buffer.from(await res.arrayBuffer());
}
