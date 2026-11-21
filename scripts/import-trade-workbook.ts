/**
 * Loads Aquifert Trade Database.xlsx into the matching trade_* tables.
 *
 *   npm run trade:import
 *   npm run trade:import -- --apply
 *   npm run trade:import -- --apply --file "C:\path\to\file.xlsx"
 *
 * Upserts by human codes / emails / import_key so a second run does not duplicate.
 */
import { existsSync } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const apply = process.argv.includes("--apply");
const fileFlag = process.argv.indexOf("--file");
const fileArg = fileFlag >= 0 ? process.argv[fileFlag + 1] : "";

const candidates = [
  fileArg,
  path.join(process.cwd(), "tmp", "trade-workbook.xlsx"),
  path.join(process.env.USERPROFILE || "", "Downloads", "Aquifert Trade Database (1).xlsx"),
  path.join(process.env.USERPROFILE || "", "Downloads", "Aquifert Trade Database.xlsx"),
].filter(Boolean);

const workbookPath = candidates.find((file) => existsSync(file));
if (!workbookPath) {
  console.error("Workbook not found. Pass --file <xlsx> or copy it to tmp/trade-workbook.xlsx");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (apply && (!url || !key)) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then run with --apply.");
  process.exit(1);
}

const db = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;

function str(v: unknown) {
  if (v == null || v === "") return "";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString();
  if (typeof v === "number" && Number.isFinite(v)) {
    if (Math.abs(v) >= 1e10) return String(Math.round(v));
    return String(v);
  }
  return String(v).trim();
}

function phone(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) {
    const digits = String(Math.round(Math.abs(v)));
    return digits ? `+${digits.replace(/^00/, "")}` : null;
  }
  const raw = String(v).trim();
  if (/e\+/i.test(raw)) {
    const n = Number(raw);
    if (Number.isFinite(n)) return `+${String(Math.round(n)).replace(/^00/, "")}`;
  }
  const digits = raw.replace(/\D/g, "");
  return digits ? `+${digits.replace(/^00/, "")}` : null;
}

function qty(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const m = str(v).replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

function money(v: unknown): number | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return Math.round((v.getTime() - Date.UTC(1899, 11, 30)) / 86400000);
  }
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(str(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function day(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = str(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const uk = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (uk) return `${uk[3]}-${uk[2].padStart(2, "0")}-${uk[1].padStart(2, "0")}`;
  if (typeof v === "number" && v > 20000 && v < 60000) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
    return d.toISOString().slice(0, 10);
  }
  return null;
}

function stamp(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString();
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function bool(v: unknown) {
  const s = str(v).toLowerCase();
  return s === "true" || s === "yes" || s === "1";
}

function csv(v: unknown) {
  return str(v)
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function get(row: Record<string, unknown>, ...names: string[]) {
  for (const name of names) {
    if (row[name] != null && row[name] !== "") return row[name];
  }
  return "";
}

function slugList(header: string) {
  return header.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function mapRfqStatus(raw: string) {
  const s = raw.trim().toLowerCase();
  const map: Record<string, string> = {
    new: "open",
    open: "open",
    collecting: "collecting",
    "rfq sent": "rfq_sent",
    "awaiting supplier": "rfq_sent",
    "awaiting matt": "awaiting_desk",
    "sent to buyer": "indication_sent",
    negotiating: "negotiating",
    "firm interest": "firm_interest",
    "firm offer sent": "firm_offer_sent",
    won: "won",
    lost: "lost",
    expired: "expired",
    closed: "closed",
  };
  return map[s] || "open";
}

function mapQuoteStatus(raw: string, noOffer: boolean) {
  if (noOffer) return "no_offer";
  const s = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (s === "firm_offer" || s === "firm") return "firm";
  if (s === "general_rate") return "general_rate";
  if (s === "incomplete") return "incomplete";
  if (s === "superseded") return "superseded";
  return "received";
}

function mapChannel(raw: string) {
  const s = raw.trim().toLowerCase();
  if (s.includes("wechat")) return "wechat";
  if (s.includes("whatsapp")) return "whatsapp";
  if (s.includes("mail")) return "email";
  if (s.includes("phone")) return "phone";
  return s && ["email", "whatsapp", "wechat", "phone", "other"].includes(s) ? s : "other";
}

function mapPartyStatus(raw: string) {
  const s = raw.trim().toLowerCase();
  if (s === "inactive") return "inactive";
  if (s === "dormant") return "dormant";
  return "active";
}

function mapOnboarding(raw: string, channelId: string | null) {
  if (channelId) return "subscribed";
  const s = raw.trim().toLowerCase();
  if (s === "subscribed") return "subscribed";
  if (s === "invited") return "invited";
  if (s === "skipped") return "skipped";
  return "to_invite";
}

function mapShipStatus(raw: string) {
  const s = raw.trim().toLowerCase();
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("deliver")) return "delivered";
  if (s.includes("ship")) return "shipped";
  if (s.includes("loading pending")) return "loading_pending";
  if (s.includes("loading")) return "loading";
  if (s.includes("signed")) return "contract_signed";
  if (s.includes("negotiat")) return "contract_negotiation";
  return "pending";
}

function mapDocType(raw: string) {
  const s = raw.trim().toLowerCase().replace(/\s+/g, "_");
  const map: Record<string, string> = {
    purchase_order: "purchase_order",
    firm_offer: "firm_offer",
    proforma: "proforma",
    sales_contract: "sales_contract",
    commercial_invoice: "commercial_invoice",
    packing_list: "packing_list",
    bl: "bl",
    bill_of_lading: "bl",
    coa: "coa",
    coo: "coo",
  };
  return map[s] || "other";
}

function mapDocStatus(raw: string) {
  const s = raw.trim().toLowerCase();
  if (s === "superseded") return "superseded";
  if (s === "sent") return "sent";
  if (s === "review") return "review";
  if (s === "void") return "void";
  return "draft";
}

function sheetRows(wb: XLSX.WorkBook, name: string) {
  const sheet = wb.Sheets[name];
  if (!sheet) return [] as Record<string, unknown>[];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: true, cellDates: true });
}

async function loadMap(table: string, columns: string) {
  if (!db) return [] as Record<string, unknown>[];
  const { data, error } = await db.from(table).select(columns).limit(5000);
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []) as Record<string, unknown>[];
}

async function upsertBy(
  table: string,
  match: Record<string, unknown>,
  body: Record<string, unknown>,
  existingId?: string | null,
) {
  if (!apply || !db) return existingId || "preview";
  if (existingId) {
    const { error } = await db.from(table).update(body).eq("id", existingId);
    if (error) throw new Error(`${table} update: ${error.message}`);
    return existingId;
  }
  const { data, error } = await db.from(table).insert(body).select("id").single();
  if (error) throw new Error(`${table} insert: ${error.message} (${JSON.stringify(match)})`);
  return data.id as string;
}

async function bumpCounter(key: string, next: number) {
  if (!apply || !db || next < 1) return;
  const { data } = await db.from("trade_settings").select("value").eq("key", key).maybeSingle();
  const current = Number(data?.value) || 0;
  if (next > current) {
    const { error } = await db.from("trade_settings").upsert({ key, value: String(next) }, { onConflict: "key" });
    if (error) throw new Error(`counter ${key}: ${error.message}`);
  }
}

function codeNum(code: string, prefix: string) {
  if (!code.toLowerCase().startsWith(prefix.toLowerCase())) return 0;
  const n = Number(code.slice(prefix.length).replace(/\D/g, ""));
  return Number.isFinite(n) ? n : 0;
}

async function main() {
  console.log(`${apply ? "IMPORT" : "PREVIEW"} ${workbookPath}`);
  const wb = XLSX.readFile(workbookPath, { cellDates: true, raw: true });

  const stats: Record<string, number> = {};
  const mark = (name: string) => {
    stats[name] = (stats[name] || 0) + 1;
  };

  // --- Lists ---
  const listSheet = wb.Sheets["Lists"];
  if (listSheet) {
    const header = (XLSX.utils.sheet_to_json<unknown[]>(listSheet, { header: 1, raw: true })[0] ?? []) as unknown[];
    const listRows = sheetRows(wb, "Lists");
    for (const headerName of header.map(String).filter(Boolean)) {
      const key = slugList(headerName);
      let order = 0;
      for (const row of listRows) {
        const value = str(row[headerName]);
        if (!value) continue;
        order += 1;
        if (apply) {
          const { error } = await db.from("trade_list_options").upsert(
            { list_key: key, value, sort_order: order, active: true },
            { onConflict: "list_key,value" },
          );
          if (error) throw new Error(`lists: ${error.message}`);
        }
        mark("lists");
      }
    }
  }

  // --- Settings ---
  for (const row of sheetRows(wb, "Settings")) {
    const key = str(get(row, "Key"));
    if (!key) continue;
    if (apply) {
      const { error } = await db.from("trade_settings").upsert({ key, value: str(get(row, "Value")) }, { onConflict: "key" });
      if (error) throw new Error(`settings: ${error.message}`);
    }
    mark("settings");
  }

  // --- Products ---
  const products = await loadMap("trade_products", "id, code, name");
  const productByName = new Map(products.map((row) => [str(row.name).toLowerCase(), str(row.id)]));
  const productByCode = new Map(products.filter((row) => row.code).map((row) => [str(row.code).toLowerCase(), str(row.id)]));
  let maxProduct = 0;
  for (const row of sheetRows(wb, "Products")) {
    const name = str(get(row, "Product Name"));
    if (!name) continue;
    const code = str(get(row, "Product ID"));
    maxProduct = Math.max(maxProduct, codeNum(code, "P-"));
    const existing = productByCode.get(code.toLowerCase()) || productByName.get(name.toLowerCase());
    const id = await upsertBy("trade_products", { name }, {
      code: code || null,
      name,
      grade: str(get(row, "Grade / Description")) || null,
      notes: str(get(row, "Notes")) || null,
      extras: { suppliers: str(get(row, "Main Suppliers")), import_key: `product:${code || name}` },
    }, existing);
    productByName.set(name.toLowerCase(), id);
    if (code) productByCode.set(code.toLowerCase(), id);
    mark("products");
  }

  // --- Buyers ---
  const buyers = await loadMap("trade_buyers", "id, code, email, whatsapp_e164, company_name, contact_name");
  const buyerByCode = new Map(buyers.map((row) => [str(row.code).toLowerCase(), str(row.id)]));
  const buyerByEmail = new Map(buyers.filter((row) => row.email).map((row) => [str(row.email).toLowerCase(), str(row.id)]));
  const buyerByPhone = new Map(buyers.filter((row) => row.whatsapp_e164).map((row) => [str(row.whatsapp_e164), str(row.id)]));
  const buyerByCompany = new Map(buyers.map((row) => [str(row.company_name).toLowerCase(), str(row.id)]));
  let maxBuyer = 0;
  for (const row of sheetRows(wb, "Buyers")) {
    const code = str(get(row, "Buyer ID"));
    const company = str(get(row, "Company Name")) || str(get(row, "Contact Name")) || code;
    if (!company) continue;
    const email = str(get(row, "Email")).toLowerCase();
    const wa = phone(get(row, "Phone/WhatsApp"));
    const sheetStatus = str(get(row, "Status"));
    maxBuyer = Math.max(maxBuyer, codeNum(code, "B-"));
    const existing = (code && buyerByCode.get(code.toLowerCase())) || (email && buyerByEmail.get(email)) || (wa && buyerByPhone.get(wa)) || undefined;
    const patch: Record<string, unknown> = {
      code: code || undefined,
      company_name: company,
      contact_name: str(get(row, "Contact Name")) || null,
      email: email || null,
      country: str(get(row, "Country")) || null,
      kyc_status: ["pending", "verified", "rejected"].includes(str(get(row, "KYC Status")).toLowerCase())
        ? str(get(row, "KYC Status")).toLowerCase()
        : "pending",
      status: mapPartyStatus(sheetStatus),
      buyer_type: str(get(row, "Buyer Type")) || null,
      job_title: str(get(row, "Job Title")) || null,
      address: str(get(row, "Address")) || null,
      partner_name: str(get(row, "Partner")) || null,
      partner_email: str(get(row, "Partner Email")) || null,
      products_of_interest: str(get(row, "Products of Interest")) || null,
      notes: str(get(row, "Notes")) || null,
      onboarding_status: mapOnboarding(sheetStatus, wa),
      extras: { wechat_id: str(get(row, "WeChat ID")), import_key: `buyer:${code || email || company}` },
    };
    if (wa) patch.whatsapp_e164 = wa;
    if (code && !existing) patch.code = code;
    const id = await upsertBy("trade_buyers", { code }, patch, existing);
    if (code) buyerByCode.set(code.toLowerCase(), id);
    if (email) buyerByEmail.set(email, id);
    if (wa) buyerByPhone.set(wa, id);
    buyerByCompany.set(company.toLowerCase(), id);
    const contact = str(get(row, "Contact Name"));
    if (contact) buyerByCompany.set(contact.toLowerCase(), id);
    mark("buyers");
  }

  // --- Suppliers ---
  const suppliers = await loadMap("trade_suppliers", "id, code, email, wechat_openid, company_name");
  const millByCode = new Map(suppliers.map((row) => [str(row.code).toLowerCase(), str(row.id)]));
  const millByEmail = new Map(suppliers.filter((row) => row.email).map((row) => [str(row.email).toLowerCase(), str(row.id)]));
  const millByOpenid = new Map(suppliers.filter((row) => row.wechat_openid).map((row) => [str(row.wechat_openid), str(row.id)]));
  const millByName = new Map(suppliers.map((row) => [str(row.company_name).toLowerCase(), str(row.id)]));
  let maxMill = 0;
  for (const row of sheetRows(wb, "Suppliers")) {
    const code = str(get(row, "Supplier ID"));
    const company = str(get(row, "Company Name")) || code;
    if (!company) continue;
    const email = str(get(row, "Email")).toLowerCase();
    const openid = str(get(row, "WeChat ID")) || null;
    const sheetStatus = str(get(row, "Status"));
    maxMill = Math.max(maxMill, codeNum(code, "S-"));
    const existing = (code && millByCode.get(code.toLowerCase())) || (email && millByEmail.get(email)) || (openid && millByOpenid.get(openid)) || undefined;
    const patch: Record<string, unknown> = {
      company_name: company,
      contact_name: str(get(row, "Contact Name")) || null,
      email: email || null,
      country: str(get(row, "Country")) || null,
      address: str(get(row, "Address")) || null,
      products_supplied: str(get(row, "Products Supplied")) || null,
      origins: csv(get(row, "Origins")),
      load_ports: csv(get(row, "Load Ports")),
      typical_payment_terms: str(get(row, "Typical Payment Terms")) || null,
      awaiting_reply: str(get(row, "Awaiting Reply")) || null,
      last_rfq_code: str(get(row, "Last RFQ Ref")) || null,
      last_contact_at: stamp(get(row, "Last Contact At", "Joined_at")),
      notes: str(get(row, "Notes")) || null,
      status: mapPartyStatus(sheetStatus),
      onboarding_status: mapOnboarding(sheetStatus, openid),
    };
    if (code && !existing) patch.code = code;
    else if (code) patch.code = code;
    if (openid) patch.wechat_openid = openid;
    const wa = phone(get(row, "Phone/WhatsApp"));
    if (wa) patch.whatsapp_e164 = wa;
    const id = await upsertBy("trade_suppliers", { code }, patch, existing);
    if (code) millByCode.set(code.toLowerCase(), id);
    if (email) millByEmail.set(email, id);
    if (openid) millByOpenid.set(openid, id);
    millByName.set(company.toLowerCase(), id);
    mark("suppliers");
  }

  // --- Forwarders ---
  const forwarders = await loadMap("trade_forwarders", "id, code, email, company_name");
  const fwdByEmail = new Map(forwarders.filter((row) => row.email).map((row) => [str(row.email).toLowerCase(), str(row.id)]));
  let maxFwd = 0;
  let fwdSeq = forwarders.length;
  for (const row of sheetRows(wb, "Freight Forwarders")) {
    const email = str(get(row, "Email")).toLowerCase();
    const company = str(get(row, "Company Name")) || (email ? email.split("@")[0] : "");
    if (!company && !email) continue;
    const code = str(get(row, "Forwarder ID"));
    maxFwd = Math.max(maxFwd, codeNum(code, "F-"));
    const existing = (email && fwdByEmail.get(email)) || undefined;
    fwdSeq += existing ? 0 : 1;
    const nextCode = code || `F-${String(fwdSeq).padStart(3, "0")}`;
    const id = await upsertBy("trade_forwarders", { email }, {
      code: nextCode,
      company_name: company || nextCode,
      contact_name: str(get(row, "Contact Name")) || null,
      email: email || null,
      whatsapp_e164: phone(get(row, "Phone/WhatsApp")),
      wechat_id: str(get(row, "WeChat ID")) || null,
      country: str(get(row, "Country")) || null,
      routes_covered: str(get(row, "Routes Covered")) || null,
      vessel_types: str(get(row, "Container/Vessel Types")) || null,
      status: mapPartyStatus(str(get(row, "Status"))),
      notes: str(get(row, "Notes")) || null,
    }, existing);
    if (email) fwdByEmail.set(email, id);
    mark("forwarders");
  }

  // --- RFQs ---
  const rfqs = await loadMap("trade_rfqs", "id, code");
  const rfqByCode = new Map(rfqs.map((row) => [str(row.code).toLowerCase(), str(row.id)]));
  let maxRfq = 0;
  for (const row of sheetRows(wb, "Buyer Requests")) {
    const code = str(get(row, "Request ID"));
    if (!code) continue;
    maxRfq = Math.max(maxRfq, codeNum(code, "rfq#"));
    const buyerCode = str(get(row, "Buyer ID"));
    const buyerPhone = phone(get(row, "Buyer ID"));
    const buyerCompany = str(get(row, "Buyer Company"));
    const buyerContact = str(get(row, "Buyer Contact"));
    const buyerId =
      (buyerCode.toLowerCase().startsWith("b-") && buyerByCode.get(buyerCode.toLowerCase())) ||
      (buyerPhone && buyerByPhone.get(buyerPhone)) ||
      (buyerCompany && buyerByCompany.get(buyerCompany.toLowerCase())) ||
      (buyerContact && buyerByCompany.get(buyerContact.toLowerCase())) ||
      null;
    const productName = str(get(row, "Product Name"));
    const selectedSupplier = str(get(row, "Selected Supplier"));
    const existing = rfqByCode.get(code.toLowerCase());
    const id = await upsertBy("trade_rfqs", { code }, {
      code,
      buyer_id: buyerId,
      product_id: productByName.get(productName.toLowerCase()) || null,
      product_label: productName,
      specification: str(get(row, "Specification")) || null,
      quantity_mt: qty(get(row, "Quantity (MT)")),
      shipment_type: str(get(row, "Shipment Type")).toLowerCase().includes("recur") ? "recurring" : str(get(row, "Shipment Type")) ? "single" : null,
      packing: str(get(row, "Packing")) || null,
      bag_specification: str(get(row, "Bag Specification")) || null,
      destination_port: str(get(row, "Destination Port")) || null,
      destination_country: str(get(row, "Destination Country")) || null,
      incoterm: str(get(row, "Incoterm")) || null,
      shipment_window: str(get(row, "Delivery/Shipment Window")) || null,
      payment_terms: str(get(row, "Payment Terms")) || null,
      inspection_company: str(get(row, "Inspection Company")) || null,
      inspection_paid_by: str(get(row, "Inspection Cost Paid By")) || null,
      origin_preference: str(get(row, "Origin Preference")) || null,
      discharge_rate: str(get(row, "Discharge Rate")) || null,
      currency: str(get(row, "Currency")) || "USD",
      target_price: money(get(row, "Target Price")),
      validity_requested: str(get(row, "Validity Requested")) || null,
      buyer_documents: str(get(row, "Buyer Documents")) || null,
      source_channel: mapChannel(str(get(row, "Source Channel"))),
      status: mapRfqStatus(str(get(row, "Status"))),
      raw_message: str(get(row, "Raw Message")) || null,
      notes: str(get(row, "Notes")) || null,
      week_start: day(get(row, "Weekstart")),
      selected_supplier_id: selectedSupplier ? millByName.get(selectedSupplier.toLowerCase()) || null : null,
      supplier_unit_price: money(get(row, "Supplier Price (per MT)")),
      margin_value: money(get(row, "Margin_added")),
      extras: { sheet_buyer_id: buyerCode, import_key: `rfq:${code}` },
    }, existing);
    rfqByCode.set(code.toLowerCase(), id);
    mark("rfqs");
  }

  // --- Quotes (RFQ offers + weekly) ---
  const quotes = await loadMap("trade_quotes", "id, code, extras, supplier_id, rfq_id, kind");
  const quoteByCode = new Map(quotes.filter((row) => row.code).map((row) => [str(row.code).toLowerCase(), str(row.id)]));
  const quoteByImport = new Map(
    quotes
      .map((row) => {
        const extras = row.extras as { import_key?: string } | null;
        return extras?.import_key ? [extras.import_key, str(row.id)] as const : null;
      })
      .filter(Boolean) as [string, string][],
  );
  const liveRfqQuote = new Map(
    quotes
      .filter((row) => row.kind === "rfq" && row.supplier_id && row.rfq_id)
      .map((row) => [`${row.supplier_id}:${row.rfq_id}`, str(row.id)]),
  );

  for (const row of sheetRows(wb, "Supplier Offers")) {
    const code = str(get(row, "Offer ID"));
    const product = str(get(row, "Product Name"));
    if (!code && !product) continue;
    const millCode = str(get(row, "Supplier ID"));
    const millEmail = str(get(row, "Supplier Email")).toLowerCase();
    const millName = str(get(row, "Supplier Name"));
    const supplierId =
      millByCode.get(millCode.toLowerCase()) || millByEmail.get(millEmail) || millByName.get(millName.toLowerCase()) || null;
    const rfqCode = str(get(row, "Linked Request ID"));
    const rfqId = rfqCode ? rfqByCode.get(rfqCode.toLowerCase()) || null : null;
    const importKey = `offer:${code || `${millCode}:${rfqCode}:${product}`}`;
    const noOffer = str(get(row, "Offer Status")).toLowerCase().includes("no");
    const existing =
      (code && quoteByCode.get(code.toLowerCase())) ||
      quoteByImport.get(importKey) ||
      (supplierId && rfqId && liveRfqQuote.get(`${supplierId}:${rfqId}`)) ||
      undefined;
    const id = await upsertBy("trade_quotes", { code }, {
      code: code || null,
      kind: "rfq",
      rfq_id: rfqId,
      supplier_id: supplierId,
      product_label: product,
      specification: str(get(row, "Specification")) || null,
      unit_price: money(get(row, "Unit Price (per MT)")),
      currency: str(get(row, "Currency")) || "USD",
      quantity_mt: qty(get(row, "Quantity Available (MT)")),
      packing: str(get(row, "Packing Type")) || null,
      origin: str(get(row, "Origin")) || null,
      load_port: str(get(row, "Load Port")) || null,
      destination_port: str(get(row, "Destination Port")) || null,
      incoterm: str(get(row, "Incoterm")) || null,
      delivery_window: str(get(row, "Delivery Turnaround")) || null,
      validity_until: day(get(row, "Validity Until")),
      payment_terms: str(get(row, "Payment Terms")) || null,
      prepayment_pct: money(get(row, "Prepayment %")),
      loading_rate: str(get(row, "Loading Rate")) || null,
      inspection: str(get(row, "Inspection")) || null,
      other_conditions: str(get(row, "Other Conditions")) || null,
      status: mapQuoteStatus(str(get(row, "Offer Status")), noOffer),
      source_channel: mapChannel(str(get(row, "Source Channel"))),
      is_no_offer: noOffer,
      week_start: day(get(row, "Weekstart")),
      raw_message: str(get(row, "Raw Message", "Supplier_response")) || null,
      received_at: stamp(get(row, "Received At", "Date Received")) || undefined,
      extras: { import_key: importKey },
    }, existing);
    if (code) quoteByCode.set(code.toLowerCase(), id);
    quoteByImport.set(importKey, id);
    if (supplierId && rfqId) liveRfqQuote.set(`${supplierId}:${rfqId}`, id);
    mark("quotes");
  }

  for (const row of sheetRows(wb, "suppliers_responses")) {
    const sheetId = str(get(row, "id"));
    const product = str(get(row, "product_name"));
    const raw = str(get(row, "raw_body"));
    if (!product && !raw) continue;
    const email = str(get(row, "email")).toLowerCase();
    const openid = str(get(row, "we_chat_id"));
    const company = str(get(row, "company"));
    const supplierId = millByEmail.get(email) || millByOpenid.get(openid) || millByName.get(company.toLowerCase()) || null;
    const rfqCode = str(get(row, "linked_rfq_id"));
    const importKey = `weekly:${sheetId || `${email}:${product}:${str(get(row, "received_at"))}`}`;
    const noOffer = bool(get(row, "is_no_offer"));
    const existing = quoteByImport.get(importKey);
    const id = await upsertBy("trade_quotes", { importKey }, {
      kind: "weekly",
      rfq_id: rfqCode ? rfqByCode.get(rfqCode.toLowerCase()) || null : null,
      supplier_id: supplierId,
      product_label: product || "weekly rate",
      unit_price: money(get(row, "unit_price")),
      currency: str(get(row, "currency")) || "USD",
      quantity_mt: qty(get(row, "quantity")),
      packing: str(get(row, "packaging")) || null,
      destination_port: str(get(row, "destination")) || null,
      incoterm: str(get(row, "incoterms")) || null,
      delivery_window: str(get(row, "delivery_turnaround")) || null,
      status: mapQuoteStatus(str(get(row, "Response Type")), noOffer),
      source_channel: mapChannel(str(get(row, "channel"))),
      is_no_offer: noOffer,
      week_start: day(get(row, "week_start")),
      broadcast_ref: str(get(row, "Broadcast Ref")) || null,
      raw_message: raw || str(get(row, "supplier_response")) || null,
      received_at: stamp(get(row, "received_at", "Received At")) || undefined,
      extras: { import_key: importKey, sheet_id: sheetId },
    }, existing);
    quoteByImport.set(importKey, id);
    mark("weekly_quotes");
  }

  // --- Freight ---
  const freight = await loadMap("trade_freight_quotes", "id, extras");
  const freightByImport = new Map(
    freight
      .map((row) => {
        const extras = row.extras as { import_key?: string } | null;
        return extras?.import_key ? [extras.import_key, str(row.id)] as const : null;
      })
      .filter(Boolean) as [string, string][],
  );

  for (const row of sheetRows(wb, "freight_forwaders_responses")) {
    const sheetId = str(get(row, "id"));
    const origin = str(get(row, "origin"));
    const dest = str(get(row, "destination"));
    if (!origin && !dest && !str(get(row, "raw_body"))) continue;
    const email = str(get(row, "email")).toLowerCase();
    const importKey = `freight-weekly:${sheetId || `${email}:${origin}:${dest}:${str(get(row, "container_type"))}`}`;
    await upsertBy("trade_freight_quotes", { importKey }, {
      kind: "weekly",
      forwarder_id: fwdByEmail.get(email) || null,
      mode: "container",
      container_type: str(get(row, "container_type")) || null,
      origin_port: origin || null,
      destination_port: dest || null,
      route: str(get(row, "route")) || null,
      rate: money(get(row, "freight_rate")),
      rate_basis: "per_container",
      currency: str(get(row, "currency")) || "USD",
      transit_days: str(get(row, "transit_days")) || null,
      is_no_offer: bool(get(row, "is_no_offer")),
      week_start: day(get(row, "week_start")),
      raw_message: str(get(row, "raw_body")) || null,
      received_at: stamp(get(row, "received_at")) || undefined,
      extras: { import_key: importKey, company: str(get(row, "company")) },
    }, freightByImport.get(importKey));
    mark("freight_weekly");
  }

  for (const row of sheetRows(wb, "Freight Quotes")) {
    const code = str(get(row, "Freight ID"));
    const origin = str(get(row, "Origin Port"));
    const dest = str(get(row, "Destination Port"));
    if (!code && !origin && !dest) continue;
    const importKey = `freight:${code || `${origin}:${dest}:${str(get(row, "Rate"))}`}`;
    const rfqCode = str(get(row, "Linked Request ID"));
    const modeRaw = str(get(row, "Shipment Mode")).toLowerCase();
    await upsertBy("trade_freight_quotes", { importKey }, {
      kind: rfqCode ? "rfq" : "weekly",
      rfq_id: rfqCode ? rfqByCode.get(rfqCode.toLowerCase()) || null : null,
      forwarder_id: fwdByEmail.get(str(get(row, "Forwarder Email")).toLowerCase()) || null,
      mode: modeRaw.includes("bulk") ? "bulk_vessel" : modeRaw ? "container" : null,
      container_type: str(get(row, "Container Type")) || null,
      origin_port: origin || null,
      destination_port: dest || null,
      route: str(get(row, "Route")) || null,
      rate: money(get(row, "Rate")),
      rate_basis: str(get(row, "Rate Basis")).toLowerCase().includes("mt")
        ? "per_mt"
        : str(get(row, "Rate Basis")).toLowerCase().includes("lump")
          ? "lump_sum"
          : "per_container",
      mt_per_container: money(get(row, "MT per Container")),
      rate_per_mt: money(get(row, "Rate per MT")),
      insurance_per_mt: money(get(row, "Insurance per MT")),
      currency: str(get(row, "Currency")) || "USD",
      transit_days: str(get(row, "Transit Days")) || null,
      validity_until: day(get(row, "Validity Until")),
      conditions: str(get(row, "Conditions/Surcharges")) || null,
      week_start: day(get(row, "Weekstart")),
      source_channel: mapChannel(str(get(row, "Source Channel"))),
      raw_message: str(get(row, "Raw Message")) || null,
      extras: { import_key: importKey, freight_id: code },
    }, freightByImport.get(importKey));
    mark("freight");
  }

  // --- Offers to buyers ---
  const offers = await loadMap("trade_buyer_offers", "id, code, extras");
  const offerByCode = new Map(offers.filter((row) => row.code).map((row) => [str(row.code).toLowerCase(), str(row.id)]));
  let offerSeq = 0;
  for (const row of sheetRows(wb, "Offers to Buyers")) {
    const buyer = str(get(row, "Buyer"));
    const product = str(get(row, "Product"));
    const notes = str(get(row, "Notes"));
    const price = money(get(row, "Offered Price (USD/MT)"));
    if (!buyer && !product && !notes && price == null) continue;
    const code = str(get(row, "Offer ID")) || `AIR-${++offerSeq}`;
    await upsertBy("trade_buyer_offers", { code }, {
      code,
      offer_date: day(get(row, "Offer Date")),
      status: str(get(row, "Status")) || null,
      enquiry_code: str(get(row, "Enquiry ID")) || null,
      quote_code: str(get(row, "Quote ID")) || null,
      buyer_name: buyer || null,
      product_label: product || null,
      quantity_mt: qty(get(row, "Quantity (MT)")),
      packing: str(get(row, "Packing")) || null,
      incoterm: str(get(row, "Incoterm")) || null,
      port: str(get(row, "Port")) || null,
      payment_terms: str(get(row, "Payment Terms")) || null,
      shipping_month: str(get(row, "Shipping Month")) || null,
      supplier_unit_price: money(get(row, "Supplier Price (USD/MT)")),
      offered_unit_price: price,
      margin_per_mt: money(get(row, "Margin (USD/MT)")),
      margin_pct: money(get(row, "Margin %")),
      total_margin: money(get(row, "Total Margin (USD)")),
      notes: notes || null,
      extras: { import_key: `buyer-offer:${code}` },
    }, offerByCode.get(code.toLowerCase()));
    mark("buyer_offers");
  }

  // --- Deal pricing ---
  const pricing = await loadMap("trade_deal_pricing", "id, code");
  const priceByCode = new Map(pricing.map((row) => [str(row.code).toLowerCase(), str(row.id)]));
  for (const row of sheetRows(wb, "Deal Pricing")) {
    const code = str(get(row, "Pricing ID"));
    if (!code) continue;
    await upsertBy("trade_deal_pricing", { code }, {
      code,
      rfq_code: str(get(row, "Request ID")) || null,
      buyer_company: str(get(row, "Buyer Company")) || null,
      deal_type: str(get(row, "Deal Type")).toLowerCase() || null,
      selected_offer_code: str(get(row, "Selected Offer ID")) || null,
      supplier_name: str(get(row, "Supplier Name")) || null,
      seller_unit_price: money(get(row, "Seller Price (per MT)")),
      seller_incoterm: str(get(row, "Seller Incoterm")) || null,
      selected_freight_code: str(get(row, "Selected Freight ID")) || null,
      freight_per_mt: money(get(row, "Freight per MT")),
      insurance_per_mt: money(get(row, "Insurance per MT")),
      landed_cost_per_mt: money(get(row, "Landed Cost per MT")),
      margin_type: str(get(row, "Margin Type")).toLowerCase() || null,
      margin_value: money(get(row, "Margin Value")),
      margin_per_mt: money(get(row, "Margin per MT")),
      floor_per_mt: money(get(row, "Floor per MT")),
      buyer_unit_price: money(get(row, "Buyer Price (per MT)")),
      buyer_incoterm: str(get(row, "Buyer Incoterm")) || null,
      currency: str(get(row, "Currency")) || "USD",
      quantity_mt: qty(get(row, "Quantity (MT)")),
      notes: str(get(row, "Notes")) || null,
      extras: {
        import_key: `pricing:${code}`,
        seller_total: str(get(row, "Seller Total")),
        buyer_total: str(get(row, "Buyer Total")),
        gross_profit: str(get(row, "Gross Profit")),
      },
    }, priceByCode.get(code.toLowerCase()));
    mark("deal_pricing");
  }

  // --- Trades / shipments ---
  const ships = await loadMap("trade_shipments", "id, legacy_trade_code");
  const shipByCode = new Map(ships.filter((row) => row.legacy_trade_code).map((row) => [str(row.legacy_trade_code).toLowerCase(), str(row.id)]));
  for (const row of sheetRows(wb, "Trades")) {
    const code = str(get(row, "Trade ID"));
    if (!code) continue;
    await upsertBy("trade_shipments", { code }, {
      legacy_trade_code: code,
      status: mapShipStatus(str(get(row, "Trade Status"))),
      pol: str(get(row, "POL")) || null,
      pod: str(get(row, "POD")) || null,
      etd: day(get(row, "ETD")),
      eta: day(get(row, "ETA")),
      lsd: day(get(row, "LSD")),
      packing: str(get(row, "Packing")) || null,
      shipping_mode: str(get(row, "Shipping Mode")) || null,
      carrier: str(get(row, "Carrier")) || null,
      booking_ref: str(get(row, "Booking Ref")) || null,
      inspection: str(get(row, "Inspection")) || null,
      notes: [str(get(row, "Next Step / Comments")), str(get(row, "Notes"))].filter(Boolean).join("\n") || null,
      extras: {
        import_key: `trade:${code}`,
        enquiry_id: str(get(row, "Enquiry ID")),
        buyer: str(get(row, "Buyer")),
        supplier: str(get(row, "Supplier")),
        product: str(get(row, "Product")),
        quantity_mt: qty(get(row, "Quantity (MT)")),
      },
    }, shipByCode.get(code.toLowerCase()));
    mark("shipments");
  }

  // --- Leads ---
  const leads = await loadMap("trade_leads", "id, code, extras");
  const leadByCode = new Map(leads.filter((row) => row.code).map((row) => [str(row.code).toLowerCase(), str(row.id)]));
  let leadSeq = 0;
  for (const row of sheetRows(wb, "Leads")) {
    const buyer = str(get(row, "Buyer"));
    const comments = str(get(row, "Comments"));
    const enquiry = str(get(row, "Enquiry ID"));
    if (!buyer && !comments && !enquiry) continue;
    const code = str(get(row, "Lead ID")) || `L-${++leadSeq}`;
    await upsertBy("trade_leads", { code }, {
      code,
      buyer_name: buyer || null,
      status: str(get(row, "Status")) || null,
      next_action: str(get(row, "Next Action")) || null,
      next_action_at: day(get(row, "Next Action Date")),
      expected_volume_mt: qty(get(row, "Expected Volume (MT)")),
      expected_margin_pct: money(get(row, "Expected Margin %")),
      enquiry_code: enquiry || null,
      comments: comments || null,
      extras: { import_key: `lead:${code}`, date: str(get(row, "Date")) },
    }, leadByCode.get(code.toLowerCase()));
    mark("leads");
  }

  // --- Documents ---
  const docs = await loadMap("trade_documents", "id, doc_number, version");
  const docByNum = new Map(docs.map((row) => [`${str(row.doc_number)}:${row.version}`, str(row.id)]));
  for (const row of sheetRows(wb, "Documents Register")) {
    const num = str(get(row, "Doc Number"));
    if (!num) continue;
    const version = Number(get(row, "Version")) || 1;
    let data: unknown = {};
    try {
      data = JSON.parse(str(get(row, "Data JSON")) || "{}");
    } catch {
      data = { raw: str(get(row, "Data JSON")) };
    }
    const kind = str(get(row, "Counterparty Type")).toLowerCase();
    await upsertBy("trade_documents", { num, version }, {
      doc_type: mapDocType(str(get(row, "Doc Type"))),
      doc_number: num,
      version,
      counterparty_name: str(get(row, "Counterparty")) || null,
      counterparty_kind: kind === "buyer" || kind === "supplier" || kind === "forwarder" ? kind : null,
      currency: str(get(row, "Currency")) || null,
      total_amount: money(get(row, "Total Amount")),
      status: mapDocStatus(str(get(row, "Status"))),
      storage_path: str(get(row, "PDF Link")) || null,
      data,
      warnings: str(get(row, "Warnings")) || null,
      created_by: str(get(row, "Created By")) || null,
    }, docByNum.get(`${num}:${version}`));
    mark("documents");
  }

  await bumpCounter("next_buyer_number", maxBuyer);
  await bumpCounter("next_supplier_number", maxMill);
  await bumpCounter("next_forwarder_number", Math.max(maxFwd, fwdSeq));
  await bumpCounter("next_rfq_number", maxRfq);

  console.log(stats);
  if (!apply) console.log("\nPreview only. Re-run with --apply to write to Supabase.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
