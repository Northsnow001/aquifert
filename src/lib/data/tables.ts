import type { CallRegistration, MemberAlert, MemberPrefs, MembershipRequest, NitrogenReport } from "@/lib/aq-modules/member-types";
import type { CalcLog, DebugEntry } from "@/lib/freight-desk/types";
import type { NetbackLog } from "@/lib/netback-desk/types";
import type { ZeroRegistration } from "@/lib/zero-types";

/** Admin-edited documents: one JSON row each in `app_documents`, or `data/<key>.json` on a local machine. */
export const DOCUMENT_KEYS = ["hub-content", "freight-desk", "netback-desk", "desk-settings", "aq-modules", "wp-import-state", "wp-import-export"] as const;
/** Machine translations of hub text, one document per language. Kept out of DOCUMENT_KEYS so data status tools skip them. */
export type TranslationDocumentKey = `ui-translations-${string}`;
export type DocumentKey = (typeof DOCUMENT_KEYS)[number] | TranslationDocumentKey;

export const LIBRARY_BUCKET = "library";

export type RecordKeys = { id: string; at: string; userId?: string | null; email?: string | null };

/** A table of rows that members or visitors add concurrently. Locally it is a JSON array in `data/<file>`. */
export type RecordSpec<T> = {
  table: string;
  file: string;
  keys: (item: T) => RecordKeys;
  /** Oldest rows beyond this count are dropped. */
  max?: number;
  /** Reads rows from an older local file layout when `file` does not exist yet. */
  legacy?: { file: string; pick: (raw: unknown) => T[] };
};

export type InboxRecord = { id: string; table: "contact_messages" | "order_enquiries"; at: string; payload: Record<string, string> };
export type BanRow = { email: string; userId: string | null; name: string; reason: string; bannedAt: string; bannedBy: string };
export type AccessRow = { at: string; email: string; action: "banned" | "reinstated"; by: string; reason: string };
export type OutboxRow = { id: string; at: string; kind: string; to: string; subject: string; status: "sent" | "failed" | "held"; error?: string; html: string };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const lower = (value: string | null | undefined) => value?.trim().toLowerCase() || null;

export const FREIGHT_LOGS: RecordSpec<CalcLog> = {
  table: "freight_calc_logs",
  file: "freight-logs.json",
  keys: (log) => ({ id: log.id, at: log.at, userId: log.user?.id ?? null, email: lower(log.user?.email) }),
};

export const FREIGHT_DEBUG: RecordSpec<DebugEntry> = {
  table: "freight_debug_logs",
  file: "freight-debug.json",
  keys: (entry) => ({ id: `${entry.at}|${entry.level}|${entry.message}`.slice(0, 240), at: entry.at }),
  max: 200,
  legacy: { file: "freight-desk.json", pick: (raw) => (isRecord(raw) && Array.isArray(raw.debug) ? (raw.debug as DebugEntry[]) : []) },
};

export const NETBACK_LOGS: RecordSpec<NetbackLog> = {
  table: "netback_calc_logs",
  file: "netback-logs.json",
  keys: (log) => ({ id: log.id, at: log.at, userId: log.user?.id ?? null, email: lower(log.user?.email) }),
};

export const INBOX: RecordSpec<InboxRecord> = {
  table: "desk_inbox",
  file: "inbox.json",
  keys: (item) => ({ id: item.id, at: item.at, email: lower(item.payload?.email) }),
  max: 5000,
};

export const ZERO: RecordSpec<ZeroRegistration> = {
  table: "zero_registrations",
  file: "zero-interest.json",
  keys: (row) => ({ id: row.id, at: row.at, userId: row.userId || null, email: lower(row.email) }),
};

export const BANS: RecordSpec<BanRow> = {
  table: "member_bans",
  file: "member-bans.json",
  keys: (ban) => ({ id: ban.email, at: ban.bannedAt, userId: ban.userId, email: ban.email }),
  legacy: { file: "member-access.json", pick: (raw) => (isRecord(raw) && Array.isArray(raw.bans) ? (raw.bans as BanRow[]) : []) },
};

export const ACCESS_EVENTS: RecordSpec<AccessRow> = {
  table: "member_access_events",
  file: "member-access-events.json",
  keys: (event) => ({ id: `${event.at}|${event.email}|${event.action}`, at: event.at, email: event.email }),
  max: 500,
  legacy: { file: "member-access.json", pick: (raw) => (isRecord(raw) && Array.isArray(raw.history) ? (raw.history as AccessRow[]) : []) },
};

export const OUTBOX: RecordSpec<OutboxRow> = {
  table: "email_outbox",
  file: "outbox.json",
  keys: (entry) => ({ id: entry.id, at: entry.at, email: lower(entry.to) }),
  max: 200,
};

export const NITROGEN_REPORTS: RecordSpec<NitrogenReport> = {
  table: "nitrogen_reports",
  file: "nitrogen-reports.json",
  keys: (row) => ({ id: row.id, at: row.at, userId: row.userId, email: lower(row.email) }),
};

export const CALL_REGISTRATIONS: RecordSpec<CallRegistration> = {
  table: "community_call_registrations",
  file: "community-call-registrations.json",
  keys: (row) => ({ id: row.id, at: row.at, userId: row.userId, email: lower(row.email) }),
};

export const MEMBER_ALERTS: RecordSpec<MemberAlert> = {
  table: "member_alerts",
  file: "member-alerts.json",
  keys: (row) => ({ id: row.id, at: row.at, userId: row.userId, email: lower(row.email) }),
};

export const MEMBER_PREFS: RecordSpec<MemberPrefs> = {
  table: "member_prefs",
  file: "member-prefs.json",
  keys: (row) => ({ id: row.id, at: row.at, userId: row.userId, email: lower(row.email) }),
};

export const MEMBERSHIP_REQUESTS: RecordSpec<MembershipRequest> = {
  table: "membership_requests",
  file: "membership-requests.json",
  keys: (row) => ({ id: row.id, at: row.at, userId: row.userId, email: lower(row.email) }),
};

export const RECORD_SPECS = [
  FREIGHT_LOGS,
  FREIGHT_DEBUG,
  NETBACK_LOGS,
  INBOX,
  ZERO,
  BANS,
  ACCESS_EVENTS,
  OUTBOX,
  NITROGEN_REPORTS,
  CALL_REGISTRATIONS,
  MEMBER_ALERTS,
  MEMBER_PREFS,
  MEMBERSHIP_REQUESTS,
] as RecordSpec<unknown>[];

/** The row written to Supabase for one record. */
export function toRow<T>(spec: RecordSpec<T>, item: T) {
  const keys = spec.keys(item);
  return { id: keys.id, at: keys.at, user_id: keys.userId ?? null, email: keys.email ?? null, data: item };
}
