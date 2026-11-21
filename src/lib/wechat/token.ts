import "server-only";

import { dataClient, databaseError } from "@/lib/data/db";
import { wechatTokenStillValid } from "@/lib/trade/invite-rules";

const TOKEN_URL = "https://api.weixin.qq.com/cgi-bin/token";

type Cached = { token: string; expiresAt: string; reused: boolean };

function wechatCredentials() {
  const appId = process.env.WECHAT_APP_ID?.trim();
  const secret = process.env.WECHAT_APP_SECRET?.trim();
  if (!appId || !secret) {
    throw new Error("Set WECHAT_APP_ID and WECHAT_APP_SECRET on the server to talk to WeChat.");
  }
  return { appId, secret };
}

async function readCache(): Promise<{ token: string; expiresAt: string } | null> {
  const db = dataClient();
  if (!db) return null;
  const { data, error } = await db.from("trade_settings").select("key, value").in("key", ["wechat_access_token", "wechat_token_expires_at"]);
  if (error) throw databaseError("read WeChat token cache", error);
  const map = Object.fromEntries((data ?? []).map((row) => [row.key, String(row.value ?? "")]));
  const token = map.wechat_access_token?.trim() ?? "";
  const expiresAt = map.wechat_token_expires_at?.trim() ?? "";
  if (!token || !wechatTokenStillValid(expiresAt)) return null;
  return { token, expiresAt };
}

async function writeCache(token: string, expiresAt: string) {
  const db = dataClient();
  if (!db) return;
  const { error } = await db.from("trade_settings").upsert(
    [
      { key: "wechat_access_token", value: token, updated_at: new Date().toISOString() },
      { key: "wechat_token_expires_at", value: expiresAt, updated_at: new Date().toISOString() },
    ],
    { onConflict: "key" },
  );
  if (error) throw databaseError("save WeChat token cache", error);
}

export async function wechatAccessToken(force = false): Promise<Cached> {
  if (!force) {
    const hit = await readCache();
    if (hit) return { ...hit, reused: true };
  }
  const { appId, secret } = wechatCredentials();
  const url = `${TOKEN_URL}?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(secret)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  const body = (await res.json().catch(() => null)) as { access_token?: string; expires_in?: number; errmsg?: string; errcode?: number } | null;
  const token = body?.access_token?.trim() ?? "";
  if (!res.ok || !token) {
    throw new Error(body?.errmsg || `WeChat token failed (${res.status}).`);
  }
  const ttl = Math.max(60, Number(body?.expires_in) || 7200);
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
  await writeCache(token, expiresAt);
  return { token, expiresAt, reused: false };
}

export async function wechatAccessTokenRetry() {
  return wechatAccessToken(true);
}
