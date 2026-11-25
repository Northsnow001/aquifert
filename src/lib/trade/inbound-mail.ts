import "server-only";

import { readDocument, updateDocument } from "@/lib/data/documents";
import { getRecord, listRecords, putRecords } from "@/lib/data/records";
import { DESK_DEALS } from "@/lib/data/tables";
import type { DeskDeal } from "@/lib/desk-hitl/types";

export type InboundMail = {
  id: string;
  at: string;
  from: string;
  subject: string;
  body: string;
  requestId: string | null;
  dealId: string | null;
  status: "matched" | "needs_matching";
  note: string;
};

export type MarketNote = { id: string; at: string; from: string; subject: string; body: string };

type FileShape = { mails: InboundMail[]; market: MarketNote[] };

const empty = (): FileShape => ({ mails: [], market: [] });

function asFile(raw: unknown): FileShape {
  if (!raw || typeof raw !== "object") return empty();
  const value = raw as Partial<FileShape>;
  return {
    mails: Array.isArray(value.mails) ? value.mails : [],
    market: Array.isArray(value.market) ? value.market : [],
  };
}

export async function readTradeInbox() {
  return asFile(await readDocument("trade-inbox"));
}

const stamp = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function findDeal(deals: DeskDeal[], subject: string, body: string, from: string) {
  const haystack = `${subject}\n${body}`.toLowerCase();
  const byId = deals.find((deal) => deal.requestId && haystack.includes(deal.requestId.toLowerCase()));
  if (byId) return { deal: byId, note: `Matched on inquiry ID ${byId.requestId}.` };
  const sender = from.toLowerCase();
  const address = sender.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/)?.[0] ?? sender;
  const open = deals.filter((deal) => deal.status !== "closed");
  const bySender = open.filter((deal) => deal.offers.some((offer) => offer.supplierEmail && address.includes(offer.supplierEmail.toLowerCase())));
  const byProduct = bySender.filter((deal) => deal.product && haystack.includes(deal.product.toLowerCase()));
  const chosen = (byProduct.length === 1 ? byProduct : bySender.length === 1 ? bySender : [])[0];
  if (chosen) return { deal: chosen, note: "Matched on the supplier address and an open trade." };
  return null;
}

async function noteOnDeal(deal: DeskDeal, text: string) {
  const fresh = (await getRecord(DESK_DEALS, deal.id)) ?? deal;
  await putRecords(DESK_DEALS, [
    {
      ...fresh,
      messages: [...fresh.messages, { id: newId("msg"), at: stamp(), from: "system" as const, channel: "email" as const, text }],
    },
  ]);
}

export async function receiveSupplierMail(input: { from: string; subject: string; body: string }) {
  const deals = await listRecords(DESK_DEALS);
  const found = findDeal(deals, input.subject, input.body, input.from);
  const row: InboundMail = {
    id: newId("mail"),
    at: stamp(),
    from: input.from.slice(0, 200),
    subject: input.subject.slice(0, 300),
    body: input.body.slice(0, 8000),
    requestId: found?.deal.requestId ?? null,
    dealId: found?.deal.id ?? null,
    status: found ? "matched" : "needs_matching",
    note: found?.note ?? "No inquiry ID, and the sender did not match a single open trade.",
  };
  await updateDocument("trade-inbox", (raw) => {
    const file = asFile(raw);
    return { ...file, mails: [row, ...file.mails].slice(0, 500) };
  });
  if (found) await noteOnDeal(found.deal, `Supplier email from ${row.from}: ${row.subject}\n\n${row.body}`);
  return row;
}

export async function assignSupplierMail(id: string, dealId: string, actor: string) {
  const file = await readTradeInbox();
  const row = file.mails.find((item) => item.id === id);
  if (!row) return { error: "That email is not in the queue." };
  const deal = await getRecord(DESK_DEALS, dealId);
  if (!deal) return { error: "That trade was not found." };
  const next = { ...row, status: "matched" as const, dealId: deal.id, requestId: deal.requestId, note: `${actor} assigned this email by hand.` };
  await updateDocument("trade-inbox", (raw) => {
    const current = asFile(raw);
    return { ...current, mails: current.mails.map((item) => (item.id === id ? next : item)) };
  });
  await noteOnDeal(deal, `Supplier email assigned by ${actor} from ${row.from}: ${row.subject}\n\n${row.body}`);
  return next;
}

export async function receiveMarketNote(input: { from: string; subject: string; body: string }) {
  const row: MarketNote = {
    id: newId("mkt"),
    at: stamp(),
    from: input.from.slice(0, 200),
    subject: input.subject.slice(0, 300),
    body: input.body.slice(0, 8000),
  };
  await updateDocument("trade-inbox", (raw) => {
    const file = asFile(raw);
    return { ...file, market: [row, ...file.market].slice(0, 200) };
  });
  return row;
}
