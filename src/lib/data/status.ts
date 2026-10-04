import "server-only";

import { existsSync } from "fs";
import path from "path";
import { dataClient } from "@/lib/data/db";
import { DOCUMENT_KEYS, LIBRARY_BUCKET, RECORD_SPECS } from "@/lib/data/tables";

export type StorageCheck = { name: string; label: string; ok: boolean; detail: string };

export type StorageStatus = {
  backend: "supabase" | "local";
  hosted: boolean;
  checks: StorageCheck[];
  /** JSON files from before the move that are still on this machine's disk. */
  localFiles: string[];
};

const LABEL: Record<string, string> = {
  app_documents: "Admin content and settings",
  freight_calc_logs: "Freight calculation logs",
  freight_debug_logs: "Freight debug log",
  netback_calc_logs: "Netback calculation logs",
  desk_inbox: "Enquiries and messages",
  zero_registrations: "Aquifert Zero registrations",
  member_bans: "Banned members",
  member_access_events: "Ban and reinstate history",
  email_outbox: "Email outbox",
  nitrogen_reports: "Nitrogen reports",
  community_call_registrations: "Weekly Market Call registrations",
  member_alerts: "Member price alerts",
  member_prefs: "Member preferences",
  membership_requests: "Membership requests",
};

const LEGACY_FILES = ["hub-content.json", "freight-desk.json", "freight-logs.json", "netback-desk.json", "netback-logs.json", "desk-settings.json", "inbox.json", "zero-interest.json", "member-access.json", "outbox.json"];

const missingTable = (message: string) => /does not exist|schema cache|relation/i.test(message);

export async function storageStatus(): Promise<StorageStatus> {
  const hosted = Boolean(process.env.VERCEL);
  const localFiles = hosted ? [] : LEGACY_FILES.filter((file) => existsSync(path.join(process.cwd(), "data", file)));
  const db = dataClient();
  if (!db) return { backend: "local", hosted, checks: [], localFiles };

  const tables = ["app_documents", ...RECORD_SPECS.map((spec) => spec.table)];
  const checks = await Promise.all(
    tables.map(async (table): Promise<StorageCheck> => {
      const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
      if (error) return { name: table, label: LABEL[table] ?? table, ok: false, detail: missingTable(error.message) ? "Table missing" : error.message };
      if (table !== "app_documents") return { name: table, label: LABEL[table] ?? table, ok: true, detail: `${(count ?? 0).toLocaleString()} rows` };
      const { data } = await db.from("app_documents").select("key");
      const saved = new Set((data ?? []).map((row) => row.key as string));
      const modules = DOCUMENT_KEYS.filter((key) => !key.startsWith("wp-import"));
      const done = modules.filter((key) => saved.has(key));
      return {
        name: table,
        label: LABEL[table],
        ok: true,
        detail: done.length === modules.length ? "All modules saved" : `${done.length} of ${modules.length} modules saved · the rest use built-in defaults until first save`,
      };
    }),
  );

  const { data: bucket, error } = await db.storage.getBucket(LIBRARY_BUCKET);
  checks.push(
    error || !bucket
      ? { name: LIBRARY_BUCKET, label: "Library files bucket", ok: false, detail: error?.message ?? "Bucket missing" }
      : { name: LIBRARY_BUCKET, label: "Library files bucket", ok: !bucket.public, detail: bucket.public ? "Public: anyone with a link can download. Set it to private." : "Private" },
  );
  return { backend: "supabase", hosted, checks, localFiles };
}
