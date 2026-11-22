import type { DeskDeal } from "@/lib/desk-hitl/types";
import type { TradeMessage } from "@/lib/trade/types";

export type BuyerAuditLine = {
  id: string;
  at: string;
  role: "buyer" | "desk" | "system";
  channel: string;
  text: string;
  requestId?: string;
  dealId?: string;
  outboundStatus?: string;
};

function digits(phone: string) {
  return phone.replace(/\D/g, "");
}

export function dealsForBuyer(deals: DeskDeal[], phone: string, email: string) {
  const wantPhone = digits(phone);
  const wantMail = email.trim().toLowerCase();
  return deals.filter((deal) => {
    const theirs = digits(deal.buyerPhone);
    if (wantPhone && theirs && (theirs.endsWith(wantPhone) || wantPhone.endsWith(theirs))) return true;
    if (wantMail && deal.buyerEmail?.trim().toLowerCase() === wantMail) return true;
    return false;
  });
}

function stampBucket(iso: string) {
  const n = Date.parse(iso);
  return Number.isFinite(n) ? Math.floor(n / 15_000) : 0;
}

function lineKey(line: BuyerAuditLine) {
  return `${line.role}|${line.text.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 180)}|${stampBucket(line.at)}`;
}

/** WhatsApp book plus every desk-thread event for this buyer, oldest first. Drops near-duplicate chat copies. */
export function mergeBuyerAudit(wa: TradeMessage[], deals: DeskDeal[]): BuyerAuditLine[] {
  const lines: BuyerAuditLine[] = [];
  for (const row of wa) {
    lines.push({
      id: row.id,
      at: row.createdAt,
      role: row.direction === "out" ? "desk" : "buyer",
      channel: row.channel || "whatsapp",
      text: row.body,
    });
  }
  for (const deal of deals) {
    for (const msg of deal.messages) {
      lines.push({
        id: msg.id,
        at: msg.at,
        role: msg.from,
        channel: msg.channel,
        text: msg.text,
        requestId: deal.requestId,
        dealId: deal.id,
        outboundStatus: msg.outboundStatus,
      });
    }
  }
  lines.sort((a, b) => (Date.parse(a.at) || 0) - (Date.parse(b.at) || 0) || a.id.localeCompare(b.id));
  const seen = new Set<string>();
  const out: BuyerAuditLine[] = [];
  for (const line of lines) {
    const key = lineKey(line);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}
