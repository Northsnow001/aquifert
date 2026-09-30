import "server-only";

import { listRecords, putRecords } from "@/lib/data/records";
import { INBOX, type InboxRecord } from "@/lib/data/tables";

export type InboxItem = InboxRecord;

export const listInbox = (): Promise<InboxItem[]> => listRecords(INBOX);

export async function recordInbox(table: InboxItem["table"], payload: Record<string, string>) {
  await putRecords(INBOX, [{ id: `${table}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, table, at: new Date().toISOString(), payload }]);
}

/** Adds or replaces items by id. */
export const mergeInbox = (incoming: InboxItem[]) => putRecords(INBOX, incoming);
