import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TelexAccess } from "@/lib/content-types";
import type { DateRangeKind } from "./dates";
import { geminiKey } from "./gemini";

let client: SupabaseClient | null | undefined;

export function db() {
  if (client === undefined) client = createAdminClient();
  return client;
}

function required() {
  const database = db();
  if (!database) throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).");
  return database;
}

function check<T>(result: { data: T; error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

/* ---------------- Engine status ---------------- */

export type EngineStatus = { gemini: boolean; supabase: boolean; tables: boolean; ready: boolean; problem: string | null };

let tablesVerified = false;

export async function engineStatus(): Promise<EngineStatus> {
  const gemini = Boolean(geminiKey());
  const database = db();
  let tables = tablesVerified;
  let problem: string | null = null;
  if (database && !tables) {
    const { error } = await database.from("aquibot_documents").select("id", { head: true, count: "exact" }).limit(1);
    tables = !error;
    tablesVerified = tables;
    if (error) problem = /does not exist|schema cache|relation/i.test(error.message) ? "The Aquibot tables are missing. Run supabase/migrations/002_aquibot.sql." : error.message;
  }
  if (!database) problem = "Supabase is not configured.";
  else if (!gemini) problem = problem ?? "GEMINI_API_KEY is not set.";
  return { gemini, supabase: Boolean(database), tables, ready: gemini && Boolean(database) && tables, problem };
}

/* ---------------- Documents and chunks ---------------- */

export type DocumentStatus = "pending" | "indexed" | "error" | "unsupported";

export type DocumentRow = {
  id: string;
  source_type: "telex" | "file";
  source_id: string;
  title: string;
  visibility: "public" | "private";
  access: TelexAccess;
  status: DocumentStatus;
  chunk_count: number;
  char_count: number;
  fingerprint: string | null;
  error: string | null;
  published_at: string | null;
  indexed_at: string | null;
  updated_at: string;
};

export async function listDocuments(): Promise<DocumentRow[]> {
  const database = db();
  if (!database) return [];
  const rows: DocumentRow[] = [];
  for (let from = 0; ; from += 1000) {
    const page = check(await database.from("aquibot_documents").select("*").order("id").range(from, from + 999)) as DocumentRow[];
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

export async function saveDocument(row: Omit<DocumentRow, "updated_at">) {
  check(await required().from("aquibot_documents").upsert({ ...row, updated_at: new Date().toISOString() }));
}

export async function deleteDocument(id: string) {
  check(await required().from("aquibot_documents").delete().eq("id", id));
}

export type ChunkInsert = {
  chunk_index: number;
  content: string;
  embedding: number[];
  source_type: "telex" | "file";
  visibility: "public" | "private";
  access: TelexAccess;
  title: string;
  published_at: string | null;
};

export async function replaceChunks(documentId: string, chunks: ChunkInsert[]) {
  const database = required();
  check(await database.from("aquibot_chunks").delete().eq("document_id", documentId));
  for (let i = 0; i < chunks.length; i += 50) {
    const batch = chunks.slice(i, i + 50).map((chunk) => ({ ...chunk, document_id: documentId, embedding: `[${chunk.embedding.join(",")}]` }));
    check(await database.from("aquibot_chunks").insert(batch));
  }
}

export async function documentChunks(documentId: string) {
  const rows = check(await required().from("aquibot_chunks").select("chunk_index, content").eq("document_id", documentId).order("chunk_index")) as {
    chunk_index: number;
    content: string;
  }[];
  return rows;
}

export type MatchRow = {
  id: number;
  document_id: string;
  chunk_index: number;
  content: string;
  source_type: "telex" | "file";
  visibility: "public" | "private";
  access: TelexAccess;
  title: string;
  published_at: string | null;
  similarity: number;
};

export async function matchChunks(embedding: number[], options: { count: number; minPublished: string | null; access: TelexAccess[] }) {
  return check(
    await required().rpc("aquibot_match_chunks", {
      query_embedding: `[${embedding.join(",")}]`,
      match_count: options.count,
      min_published: options.minPublished,
      access_levels: options.access,
    }),
  ) as MatchRow[];
}

export async function findChunksByText(text: string, limit = 40) {
  const pattern = `%${text.replace(/[%_\\]/g, (char) => `\\${char}`)}%`;
  return check(
    await required()
      .from("aquibot_chunks")
      .select("id, document_id, chunk_index, content, source_type, visibility, access, title, published_at")
      .ilike("content", pattern)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit),
  ) as Omit<MatchRow, "similarity">[];
}

export async function indexedTelexCount() {
  const database = db();
  if (!database) return 0;
  const { count } = await database.from("aquibot_documents").select("id", { head: true, count: "exact" }).eq("source_type", "telex").eq("status", "indexed");
  return count ?? 0;
}

export async function chunkCount() {
  const database = db();
  if (!database) return 0;
  const { count } = await database.from("aquibot_chunks").select("id", { head: true, count: "exact" });
  return count ?? 0;
}

/* ---------------- Sessions and messages ---------------- */

export type SessionRow = {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  user_plan: string;
  title: string;
  test_mode: boolean;
  message_count: number;
  created_at: string;
  updated_at: string;
};

export type MessageMeta = {
  rewrittenQuery?: string;
  intent?: string;
  dateRanges?: { start: number; end: number; kind: DateRangeKind; phrase: string }[];
  dateFallback?: boolean;
  sources?: { title: string; sourceType: "telex" | "file"; publishedAt: string | null }[];
  privateSources?: number;
  timings?: Record<string, number>;
  model?: string;
  usage?: Record<string, number>;
  error?: string;
  stopped?: boolean;
};

export type MessageRow = { id: number; session_id: string; role: "user" | "assistant"; content: string; meta: MessageMeta; created_at: string };

export async function createSession(input: { userId: string; email: string; name: string; plan: string; title: string; testMode: boolean }) {
  return check(
    await required()
      .from("aquibot_sessions")
      .insert({ user_id: input.userId, user_email: input.email, user_name: input.name, user_plan: input.plan, title: input.title, test_mode: input.testMode })
      .select("*")
      .single(),
  ) as SessionRow;
}

export async function getSessionRow(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await required().from("aquibot_sessions").select("*").eq("id", id).maybeSingle();
  return (data as SessionRow | null) ?? null;
}

export async function listUserSessions(userId: string, limit = 40) {
  const database = db();
  if (!database) return [];
  return check(await database.from("aquibot_sessions").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(limit)) as SessionRow[];
}

export async function listSessions(options: { search?: string; limit: number; offset: number }) {
  let query = required().from("aquibot_sessions").select("*", { count: "exact" }).order("updated_at", { ascending: false });
  const search = options.search?.trim();
  if (search) {
    const term = `%${search.replace(/[%_\\,()]/g, " ")}%`;
    query = query.or(`user_email.ilike.${term},user_name.ilike.${term},title.ilike.${term}`);
  }
  const { data, count, error } = await query.range(options.offset, options.offset + options.limit - 1);
  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as SessionRow[], total: count ?? 0 };
}

export async function sessionMessages(sessionId: string) {
  return check(await required().from("aquibot_messages").select("*").eq("session_id", sessionId).order("id")) as MessageRow[];
}

export async function appendExchange(session: SessionRow, user: { content: string }, assistant: { content: string; meta: MessageMeta }) {
  const database = required();
  const rows = check(
    await database
      .from("aquibot_messages")
      .insert([
        { session_id: session.id, role: "user", content: user.content, meta: {} },
        { session_id: session.id, role: "assistant", content: assistant.content, meta: assistant.meta },
      ])
      .select("id, role"),
  ) as { id: number; role: string }[];
  check(await database.from("aquibot_sessions").update({ message_count: session.message_count + 2, updated_at: new Date().toISOString() }).eq("id", session.id));
  return rows.find((row) => row.role === "assistant")?.id ?? null;
}

export async function deleteSessionRow(id: string) {
  check(await required().from("aquibot_sessions").delete().eq("id", id));
}

export async function sessionStats() {
  const database = db();
  if (!database) return { sessions: 0, month: 0, questions: 0, users: 0 };
  const month = monthKey();
  const monthStart = `${month}-01T00:00:00Z`;
  const [{ count: sessions }, { count: monthSessions }, { data: usage }] = await Promise.all([
    database.from("aquibot_sessions").select("id", { head: true, count: "exact" }),
    database.from("aquibot_sessions").select("id", { head: true, count: "exact" }).gte("updated_at", monthStart),
    database.from("aquibot_usage").select("questions").eq("month", month),
  ]);
  const rows = (usage ?? []) as { questions: number }[];
  return { sessions: sessions ?? 0, month: monthSessions ?? 0, questions: rows.reduce((sum, row) => sum + row.questions, 0), users: rows.length };
}

/* ---------------- Monthly usage ---------------- */

export function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

export function nextMonthStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
}

export async function questionsUsed(userId: string) {
  const database = db();
  if (!database) return 0;
  const { data } = await database.from("aquibot_usage").select("questions").eq("user_id", userId).eq("month", monthKey()).maybeSingle();
  return (data as { questions: number } | null)?.questions ?? 0;
}

export async function countQuestion(userId: string) {
  const data = check(await required().rpc("aquibot_increment_usage", { p_user: userId, p_month: monthKey() }));
  return typeof data === "number" ? data : 0;
}

/* ---------------- Logs ---------------- */

export type LogKind = "index" | "connection" | "chat";
export type LogLevel = "info" | "warn" | "error";
export type LogRow = { id: number; kind: LogKind; level: LogLevel; message: string; meta: Record<string, unknown>; created_at: string };

/** Best effort: logging never breaks the request that triggered it. */
export async function writeLog(kind: LogKind, level: LogLevel, message: string, meta: Record<string, unknown> = {}) {
  try {
    await db()?.from("aquibot_logs").insert({ kind, level, message: message.slice(0, 2000), meta });
  } catch {
    // ignored
  }
}

export async function listLogs(options: { kind?: LogKind; level?: LogLevel; limit: number }) {
  const database = db();
  if (!database) return [];
  let query = database.from("aquibot_logs").select("*").order("id", { ascending: false }).limit(options.limit);
  if (options.kind) query = query.eq("kind", options.kind);
  if (options.level) query = query.eq("level", options.level);
  const { data } = await query;
  return (data ?? []) as LogRow[];
}

export async function clearLogs(kind?: LogKind) {
  let query = required().from("aquibot_logs").delete();
  query = kind ? query.eq("kind", kind) : query.gte("id", 0);
  check(await query);
}

/* ---------------- Retention ---------------- */

let lastPrune = 0;

/** Deletes sessions idle longer than the retention setting and logs older than 30 days, at most every 6 hours. */
export async function pruneOldData(months: number) {
  const database = db();
  if (!database || Date.now() - lastPrune < 6 * 3_600_000) return;
  lastPrune = Date.now();
  if (months > 0) {
    const cutoff = new Date();
    cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
    await database.from("aquibot_sessions").delete().lt("updated_at", cutoff.toISOString());
  }
  await database.from("aquibot_logs").delete().lt("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString());
}
