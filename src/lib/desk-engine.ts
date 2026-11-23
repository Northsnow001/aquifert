/**
 * Who answers buyers and suppliers.
 * n8n is the default, so a misbehaving in-app agent can be taken off the live path
 * without deleting it. Bring one channel back with DESK_WHATSAPP=agent or
 * DESK_WECHAT=agent. DESK_ENGINE=agent turns the in-app agent on for both.
 */

export type DeskChannel = "whatsapp" | "wechat";

const N8N = "https://northsnow.app.n8n.cloud/webhook";

export function deskUsesAgent(channel: DeskChannel = "whatsapp") {
  const all = process.env.DESK_ENGINE?.trim().toLowerCase();
  if (all === "agent" || all === "n8n") return all === "agent";
  const specific = process.env[channel === "wechat" ? "DESK_WECHAT" : "DESK_WHATSAPP"]?.trim().toLowerCase();
  return specific === "agent";
}

export function n8nWhatsAppInboundUrl() {
  return process.env.N8N_WHATSAPP_INBOUND_URL?.trim() || `${N8N}/inbound`;
}

export function n8nWechatInboundUrl() {
  return process.env.N8N_WECHAT_WEBHOOK_URL?.trim() || `${N8N}/wechat`;
}

export async function forwardToN8n(url: string, body: string, contentType: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": contentType },
    body,
    signal: AbortSignal.timeout(55_000),
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`n8n ${url} answered ${res.status} ${text.slice(0, 180)}`);
  return text;
}
