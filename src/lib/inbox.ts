import "server-only";

import { dataClient } from "@/lib/data/db";
import { countRecords, listRecords, putRecords } from "@/lib/data/records";
import { INBOX, type InboxRecord } from "@/lib/data/tables";

export type InboxItem = InboxRecord;

export const listInbox = (): Promise<InboxItem[]> => listRecords(INBOX);

export type InboxSnapshot = { total: number; orders: number; latestAt: string | null };

/** Counts and the newest time, without downloading every enquiry. */
export async function inboxSnapshot(): Promise<InboxSnapshot> {
  const db = dataClient();
  if (!db) {
    const rows = await listInbox();
    return {
      total: rows.length,
      orders: rows.filter((item) => item.table === "order_enquiries").length,
      latestAt: rows[0]?.at ?? null,
    };
  }
  const [total, orders, latest] = await Promise.all([
    countRecords(INBOX),
    db.from(INBOX.table).select("id", { count: "exact", head: true }).contains("data", { table: "order_enquiries" }),
    listRecords(INBOX, { limit: 1 }),
  ]);
  if (orders.error) {
    const rows = await listInbox();
    return {
      total: rows.length,
      orders: rows.filter((item) => item.table === "order_enquiries").length,
      latestAt: rows[0]?.at ?? null,
    };
  }
  return { total, orders: orders.count ?? 0, latestAt: latest[0]?.at ?? null };
}

export async function recordInbox(table: InboxItem["table"], payload: Record<string, string>) {
  await putRecords(INBOX, [{ id: `${table}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, table, at: new Date().toISOString(), payload }]);
}

/** Adds or replaces items by id. */
export const mergeInbox = (incoming: InboxItem[]) => putRecords(INBOX, incoming);
