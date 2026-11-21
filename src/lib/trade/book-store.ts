import "server-only";

import { dataClient, databaseError } from "@/lib/data/db";
import { BOOK_SPECS, bookSpec, type BookField, type BookRow, type BookSpec } from "@/lib/trade/book";
import { formatOfferCode, mondayOf } from "@/lib/trade/offer-code";

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

function stamp(v: unknown) {
  const s = text(v);
  if (!s) return "";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s.slice(0, 19).replace("T", " ") : d.toISOString().slice(0, 16).replace("T", " ");
}

function extrasOf(row: Record<string, unknown>) {
  const extras = row.extras;
  return extras && typeof extras === "object" && !Array.isArray(extras) ? (extras as Record<string, unknown>) : {};
}

function nested(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  }
  return null;
}

function missingRfq(row: Record<string, unknown>) {
  const checks: [string, unknown][] = [
    ["Product Name", row.product_label],
    ["Quantity (MT)", row.quantity_mt],
    ["Destination Port", row.destination_port || row.destination_country],
    ["Incoterm", row.incoterm],
    ["Packing", row.packing],
  ];
  return checks.filter(([, value]) => value == null || value === "").map(([label]) => label).join(", ");
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
  const extras = extrasOf(row);
  const buyer = nested(row, "buyer", "trade_buyers");
  const mill = nested(row, "mill", "trade_suppliers");
  const supplier = nested(row, "supplier", "trade_suppliers") || mill;
  const rfq = nested(row, "rfq", "trade_rfqs");
  const weekly = text(row.kind) === "weekly" || text(row.kind) === "broadcast";
  return {
    id: text(row.id),
    ...row,
    date_received: stamp(row.created_at || row.received_at),
    last_updated: stamp(row.updated_at),
    received_at: stamp(row.received_at) || stamp(row.created_at),
    main_suppliers: text(extras.suppliers),
    buyer_code: text(extras.sheet_buyer_id || buyer?.code),
    buyer_company: text(buyer?.company_name),
    buyer_contact: text(buyer?.contact_name),
    selected_supplier_name: text(mill?.company_name),
    supplier_code: text(supplier?.code),
    supplier_name: text(supplier?.company_name),
    supplier_contact: text(supplier?.contact_name),
    supplier_email: text(supplier?.email),
    rfq_code: text(rfq?.code) || text(extras.rfq_code),
    validity_text: text(extras.validity),
    price_check_flag: text(extras.price_check_flag),
    notes: text(row.notes) || text(extras.notes),
    response_type: weekly ? "WEEKLY_RESPONSE" : "RFQ_RESPONSE",
    supplier_response: text(row.raw_message),
    core_fields_complete: row.buyer_ready === true ? "yes" : row.buyer_ready === false ? "no" : "",
    missing_fields: spec.slug === "rfqs" ? missingRfq(row) : "",
  };
}

export async function listBookRows(slug: string): Promise<BookRow[]> {
  const spec = bookSpec(slug);
  const db = dataClient();
  if (!spec || !db) return [];
  const order = spec.identity === "lists" ? "list_key" : spec.identity === "settings" ? "key" : "updated_at";
  const ascending = spec.identity !== "uuid";
  const select =
    spec.slug === "rfqs"
      ? "*, buyer:trade_buyers!buyer_id(code, company_name, contact_name), mill:trade_suppliers!selected_supplier_id(company_name)"
      : spec.slug === "quotes"
        ? "*, supplier:trade_suppliers!supplier_id(code, company_name, contact_name, email), rfq:trade_rfqs!rfq_id(code)"
        : "*";
  const queried = await db.from(spec.table).select(select).order(order, { ascending }).limit(2000);
  const result = queried.error && (spec.slug === "rfqs" || spec.slug === "quotes")
    ? await db.from(spec.table).select("*").order(order, { ascending }).limit(2000)
    : queried;
  if (result.error) throw databaseError(`list ${spec.title}`, result.error);
  return (result.data ?? []).map((row) => fromDb(spec, row as Record<string, unknown>));
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
    if (field.persist === false) continue;
    if (field.readonly && spec.codeCounter && field.key === "code") continue;
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

  if (spec.slug === "quotes" && !text(body.code)) {
    const now = new Date();
    for (let line = 0; line < 40; line++) {
      const code = formatOfferCode(now, line);
      const { data } = await db.from("trade_quotes").select("id").eq("code", code).maybeSingle();
      if (!data) {
        body.code = code;
        break;
      }
    }
    if (!text(body.week_start)) body.week_start = mondayOf(now);
  }

  const { data, error } = await db.from(spec.table).insert(body).select("id").single();
  if (error) throw databaseError(`create ${spec.title}`, error);
  return { id: text(data.id) };
}

export async function deleteBookRow(slug: string, id: string) {
  await deleteBookRows(slug, [id]);
}

export async function deleteBookRows(slug: string, ids: string[]) {
  const spec = bookSpec(slug);
  const db = dataClient();
  if (!spec || !db) throw new Error("Supabase is not configured.");
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (!unique.length) return 0;

  if (spec.identity === "settings") {
    for (let i = 0; i < unique.length; i += 80) {
      const { error } = await db.from(spec.table).delete().in("key", unique.slice(i, i + 80));
      if (error) throw databaseError("delete setting", error);
    }
    return unique.length;
  }

  if (spec.identity === "lists") {
    for (const id of unique) {
      const [list_key, ...rest] = id.split("::");
      const value = rest.join("::");
      if (!list_key || !value) continue;
      const { error } = await db.from(spec.table).delete().eq("list_key", list_key).eq("value", value);
      if (error) throw databaseError("delete list option", error);
    }
    return unique.length;
  }

  for (let i = 0; i < unique.length; i += 80) {
    const { error } = await db.from(spec.table).delete().in("id", unique.slice(i, i + 80));
    if (error) throw databaseError(`delete ${spec.title}`, error);
  }
  return unique.length;
}
