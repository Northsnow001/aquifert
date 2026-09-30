import "server-only";

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

export type InboxItem = {
  id: string;
  table: "contact_messages" | "order_enquiries";
  at: string;
  payload: Record<string, string>;
};

const filePath = path.join(process.cwd(), "data", "inbox.json");
const MAX_ITEMS = 1000;

export function listInbox(): InboxItem[] {
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as InboxItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveInbox(items: InboxItem[]) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(items.slice(0, MAX_ITEMS), null, 2)}\n`, "utf8");
}

export function recordInbox(table: InboxItem["table"], payload: Record<string, string>) {
  const items = listInbox();
  items.unshift({
    id: `${table}-${Date.now()}`,
    table,
    at: new Date().toISOString(),
    payload,
  });
  saveInbox(items);
}

/** Adds or replaces items by id, newest first. */
export function mergeInbox(incoming: InboxItem[]) {
  const byId = new Map(listInbox().map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  saveInbox([...byId.values()].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)));
}
