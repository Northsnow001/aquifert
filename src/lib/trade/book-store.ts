import "server-only";

import { dataClient, databaseError } from "@/lib/data/db";
import { BOOK_SPECS, bookSpec, type BookField, type BookRow, type BookSpec } from "@/lib/trade/book";

function text(v: unknown) {
  return v == null ? "" : String(v);
}

function coerce(field: BookField, raw: unknown) {
  if (field.type === "checkbox") return raw === true || raw === "true" || raw === "on" || raw === "1";
  if (field.type === "number") {
    if (raw === "" || raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  if (field.type === "date") {
    const s = text(raw).trim();
    return s ? s.slice(0, 10) : null;
  }
  const s = text(raw).trim();
  return s === "" ? null : s;
}

function fromDb(spec: BookSpec, row: Record<string, unknown>): BookRow {
  if (spec.identity === "lists") {
    return {
      id: `${text(row.list_key)}::${text(row.value)}`,
      list_key: row.list_key,
      value: row.value,
      sort_order: row.sort_order,
      active: row.active,
    };
  }
  if (spec.identity === "settings") {
    return { id: text(row.key), key: row.key, value: row.value, updated_at: row.updated_at };
  }
  return { id: text(row.id), ...row };
}

export async function listBookRows(slug: string): Promise<BookRow[]> {
  const spec = bookSpec(slug);
  const db = dataClient();
  if (!spec || !db) return [];
  const order = spec.identity === "lists" ? "list_key" : spec.identity === "settings" ? "key" : "updated_at";
  const ascending = spec.identity !== "uuid";
  const { data, error } = await db.from(spec.table).select("*").order(order, { ascending }).limit(2000);
  if (error) throw databaseError(`list ${spec.title}`, error);
  return (data ?? []).map((row) => fromDb(spec, row as Record<string, unknown>));
}

export async function listAllBookCounts() {
  const db = dataClient();
  if (!db) return {} as Record<string, number>;
  const entries = await Promise.all(
    BOOK_SPECS.map(async (spec) => {
      const { count, error } = await db.from(spec.table).select("*", { count: "exact", head: true });
      if (error) return [spec.slug, 0] as const;
      return [spec.slug, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(entries);
}

function valuesFor(spec: BookSpec, input: Record<string, string>) {
  const body: Record<string, unknown> = {};
  for (const field of spec.fields) {
    if (field.readonly && spec.codeCounter) continue;
    body[field.key] = coerce(field, input[field.key]);
  }
  return body;
}

export async function saveBookRow(slug: string, id: string | null, input: Record<string, string>) {
  const spec = bookSpec(slug);
  const db = dataClient();
  if (!spec || !db) throw new Error("Supabase is not configured.");
  const body = valuesFor(spec, input);

  if (spec.identity === "settings") {
    const key = text(body.key);
    const value = text(body.value);
    if (!key) throw new Error("Key is required.");
    const { error } = await db.from(spec.table).upsert({ key, value }, { onConflict: "key" });
    if (error) throw databaseError("save setting", error);
    return { id: key };
  }

  if (spec.identity === "lists") {
    const list_key = text(body.list_key);
    const value = text(body.value);
    if (!list_key || !value) throw new Error("List and value are required.");
    if (id && id.includes("::")) {
      const [oldKey, oldValue] = id.split("::");
      await db.from(spec.table).delete().eq("list_key", oldKey).eq("value", oldValue);
    }
    const { error } = await db.from(spec.table).upsert(
      { list_key, value, sort_order: Number(body.sort_order) || 0, active: body.active !== false },
      { onConflict: "list_key,value" },
    );
    if (error) throw databaseError("save list option", error);
    return { id: `${list_key}::${value}` };
  }

  if (id) {
    const { error } = await db.from(spec.table).update(body).eq("id", id);
    if (error) throw databaseError(`update ${spec.title}`, error);
    return { id };
  }

  if (spec.codeCounter && !text(body.code)) {
    const { data: code, error: codeError } = await db.rpc("trade_next_code", {
      counter_key: spec.codeCounter.key,
      prefix: spec.codeCounter.prefix,
      pad: spec.codeCounter.pad,
    });
    if (codeError) throw databaseError("allocate code", codeError);
    body.code = code;
  }

  const { data, error } = await db.from(spec.table).insert(body).select("id").single();
  if (error) throw databaseError(`create ${spec.title}`, error);
  return { id: text(data.id) };
}

export async function deleteBookRow(slug: string, id: string) {
  const spec = bookSpec(slug);
  const db = dataClient();
  if (!spec || !db) throw new Error("Supabase is not configured.");
  if (spec.identity === "settings") {
    const { error } = await db.from(spec.table).delete().eq("key", id);
    if (error) throw databaseError("delete setting", error);
    return;
  }
  if (spec.identity === "lists") {
    const [list_key, value] = id.split("::");
    const { error } = await db.from(spec.table).delete().eq("list_key", list_key).eq("value", value);
    if (error) throw databaseError("delete list option", error);
    return;
  }
  const { error } = await db.from(spec.table).delete().eq("id", id);
  if (error) throw databaseError(`delete ${spec.title}`, error);
}
