import "server-only";

import { dataClient, databaseError } from "@/lib/data/db";
import type {
  OnboardingStatus,
  TradeAgent,
  TradeBuyer,
  TradeCounts,
  TradeFreightQuote,
  TradeMessage,
  TradeQuote,
  TradeRfq,
  TradeSupplier,
  TradeSupplierDraft,
  WechatChatState,
} from "@/lib/trade/types";
import { ONBOARDING_STATUSES } from "@/lib/trade/types";

const text = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const num = (v: unknown) => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const onboarding = (v: unknown): OnboardingStatus =>
  ONBOARDING_STATUSES.includes(v as OnboardingStatus) ? (v as OnboardingStatus) : "to_invite";

const list = (v: unknown) => (Array.isArray(v) ? v.map((item) => text(item)).filter(Boolean) : []);

function csvList(raw: string) {
  return raw.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
}

function e164(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return digits ? `+${digits.replace(/^00/, "")}` : null;
}

function supplierFrom(row: Record<string, unknown>): TradeSupplier {
  return {
    id: text(row.id),
    code: text(row.code),
    companyName: text(row.company_name),
    contactName: text(row.contact_name),
    email: text(row.email),
    whatsappE164: text(row.whatsapp_e164) || null,
    wechatOpenid: text(row.wechat_openid) || null,
    country: text(row.country),
    address: text(row.address),
    productsSupplied: text(row.products_supplied),
    origins: list(row.origins),
    loadPorts: list(row.load_ports),
    paymentTerms: text(row.typical_payment_terms),
    status: text(row.status) || "active",
    onboardingStatus: onboarding(row.onboarding_status),
    qrTicket: text(row.qr_ticket) || null,
    qrScene: text(row.qr_scene) || null,
    invitedAt: text(row.invited_at) || null,
    lastRfqCode: text(row.last_rfq_code) || null,
    awaitingReply: text(row.awaiting_reply) || null,
    lastContactAt: text(row.last_contact_at) || null,
    notes: text(row.notes),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

function supplierWrite(input: TradeSupplierDraft) {
  const openid = input.wechatOpenid?.trim() || null;
  return {
    company_name: input.companyName.trim(),
    contact_name: input.contactName.trim() || null,
    email: input.email.trim().toLowerCase(),
    whatsapp_e164: e164(input.phone),
    country: input.country.trim() || null,
    address: input.address.trim() || null,
    products_supplied: input.productsSupplied.trim() || null,
    origins: csvList(input.origins),
    load_ports: csvList(input.loadPorts),
    typical_payment_terms: input.paymentTerms.trim() || null,
    notes: input.notes.trim() || null,
    wechat_openid: openid,
    onboarding_status: openid ? "subscribed" : undefined,
  };
}

export async function listTradeSuppliers(): Promise<TradeSupplier[]> {
  const db = dataClient();
  if (!db) return [];
  const { data, error } = await db.from("trade_suppliers").select("*").order("updated_at", { ascending: false });
  if (error) throw databaseError("list suppliers", error);
  return (data ?? []).map((row) => supplierFrom(row as Record<string, unknown>));
}

export async function getTradeSupplier(id: string): Promise<TradeSupplier | null> {
  const db = dataClient();
  if (!db) return null;
  const { data, error } = await db.from("trade_suppliers").select("*").eq("id", id).maybeSingle();
  if (error) throw databaseError("read supplier", error);
  return data ? supplierFrom(data as Record<string, unknown>) : null;
}

export async function getTradeSupplierByWechatOpenid(openid: string): Promise<TradeSupplier | null> {
  const db = dataClient();
  if (!db) return null;
  const id = openid.trim();
  if (!id) return null;
  const { data, error } = await db.from("trade_suppliers").select("*").eq("wechat_openid", id).maybeSingle();
  if (error) throw databaseError("read supplier by WeChat OpenID", error);
  return data ? supplierFrom(data as Record<string, unknown>) : null;
}

export async function insertTradeSupplier(input: TradeSupplierDraft) {
  const db = dataClient();
  if (!db) throw new Error("Supabase is not configured.");
  const { data: code, error: codeError } = await db.rpc("trade_next_code", {
    counter_key: "next_supplier_number",
    prefix: "S-",
    pad: 3,
  });
  if (codeError) throw databaseError("allocate supplier code", codeError);
  const body = supplierWrite(input);
  const { data, error } = await db
    .from("trade_suppliers")
    .insert({
      code: String(code),
      ...body,
      status: "active",
      onboarding_status: body.wechat_openid ? "subscribed" : "to_invite",
    })
    .select("*")
    .single();
  if (error) throw databaseError("create supplier", error);
  return supplierFrom(data as Record<string, unknown>);
}

export async function updateTradeSupplier(id: string, input: TradeSupplierDraft) {
  const db = dataClient();
  if (!db) throw new Error("Supabase is not configured.");
  const body = supplierWrite(input);
  const patch: Record<string, unknown> = { ...body };
  if (!body.wechat_openid) delete patch.wechat_openid;
  if (!body.onboarding_status) delete patch.onboarding_status;
  const { data, error } = await db.from("trade_suppliers").update(patch).eq("id", id).select("*").single();
  if (error) throw databaseError("update supplier", error);
  return supplierFrom(data as Record<string, unknown>);
}

export async function linkSupplierWechatFollow(input: { openid: string; email: string; joinedAt?: string }) {
  const db = dataClient();
  if (!db) throw new Error("Supabase is not configured.");
  const email = input.email.trim().toLowerCase();
  const openid = input.openid.trim();
  if (!email || !openid) return { ok: false as const, error: "openid and email are required." };
  if (/[,()]/.test(email)) return { ok: false as const, error: "Invalid invite email." };

  const { data: rows, error: lookupError } = await db
    .from("trade_suppliers")
    .select("*")
    .or(`email.eq.${email},invited_email.eq.${email},qr_scene.eq.${email}`)
    .limit(5);
  if (lookupError) throw databaseError("find supplier for WeChat follow", lookupError);
  const mill = (rows ?? []).find((row) => {
    const r = row as Record<string, unknown>;
    return [r.email, r.invited_email, r.qr_scene].some((value) => String(value ?? "").trim().toLowerCase() === email);
  });
  if (!mill) return { ok: false as const, unmatched: true as const, error: "No supplier with that invite email." };
  const millId = String((mill as { id: string }).id);

  const now = input.joinedAt || new Date().toISOString();
  const { data, error } = await db
    .from("trade_suppliers")
    .update({
      wechat_openid: openid,
      onboarding_status: "subscribed",
      last_contact_at: now,
    })
    .eq("id", millId)
    .select("*")
    .single();
  if (error) throw databaseError("link WeChat OpenID", error);
  const supplier = supplierFrom(data as Record<string, unknown>);
  await logTradeMessage({
    direction: "in",
    channel: "wechat",
    supplierId: supplier.id,
    fromAddress: openid,
    toAddress: email,
    body: "WeChat follow / QR scan",
    payload: { event: "subscribe", openid, email },
  });
  return { ok: true as const, supplier };
}

export async function markSupplierInvited(id: string, fields: { email: string; scene: string; ticket: string }) {
  const db = dataClient();
  if (!db) throw new Error("Supabase is not configured.");
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("trade_suppliers")
    .update({
      onboarding_status: "invited",
      invited_at: now,
      invited_email: fields.email,
      qr_scene: fields.scene,
      qr_ticket: fields.ticket,
      last_contact_at: now,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw databaseError("mark supplier invited", error);
  return supplierFrom(data as Record<string, unknown>);
}

export async function setSupplierAwaitingReply(id: string, stage: string) {
  const db = dataClient();
  if (!db) throw new Error("Supabase is not configured.");
  const { error } = await db
    .from("trade_suppliers")
    .update({ awaiting_reply: stage || null, last_contact_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw databaseError("save supplier chat stage", error);
}

const emptyChat = (): WechatChatState => ({
  stage: "",
  quoteType: "",
  rfqId: "",
  missingFields: [],
  followUpCount: 0,
  captured: {},
});

export async function getSupplierChatState(id: string): Promise<WechatChatState> {
  const db = dataClient();
  if (!db) return emptyChat();
  const { data, error } = await db.from("trade_suppliers").select("awaiting_reply, extras").eq("id", id).maybeSingle();
  if (error) throw databaseError("read supplier chat state", error);
  const extras = (data?.extras as Record<string, unknown> | null) ?? {};
  const chat = (extras.wechat_chat as Record<string, unknown> | undefined) ?? {};
  return {
    stage: text(chat.stage) || text(data?.awaiting_reply),
    quoteType: text(chat.quoteType),
    rfqId: text(chat.rfqId),
    missingFields: Array.isArray(chat.missingFields) ? chat.missingFields.map((item) => text(item)).filter(Boolean) : [],
    followUpCount: Number(chat.followUpCount) || 0,
    captured: chat.captured && typeof chat.captured === "object" ? (chat.captured as Record<string, unknown>) : {},
  };
}

export async function saveSupplierChatState(id: string, state: WechatChatState) {
  const db = dataClient();
  if (!db) return;
  const { data, error: readError } = await db.from("trade_suppliers").select("extras").eq("id", id).maybeSingle();
  if (readError) throw databaseError("read supplier extras", readError);
  const extras = { ...((data?.extras as Record<string, unknown> | null) ?? {}), wechat_chat: state };
  const { error } = await db
    .from("trade_suppliers")
    .update({ extras, awaiting_reply: state.stage || null, last_contact_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw databaseError("save supplier chat state", error);
}

export async function listWechatThread(input: { supplierId?: string | null; openid?: string | null }): Promise<TradeMessage[]> {
  const db = dataClient();
  if (!db) return [];
  const supplierId = input.supplierId?.trim() || "";
  const openid = input.openid?.trim() || "";
  if (!supplierId && !openid) return [];
  let query = db.from("trade_messages").select("*").eq("channel", "wechat").order("created_at", { ascending: true }).limit(400);
  if (supplierId && openid) query = query.or(`supplier_id.eq.${supplierId},from_address.eq.${openid},to_address.eq.${openid}`);
  else if (supplierId) query = query.eq("supplier_id", supplierId);
  else query = query.or(`from_address.eq.${openid},to_address.eq.${openid}`);
  const { data, error } = await query;
  if (error) throw databaseError("list WeChat thread", error);
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: text(r.id),
      direction: text(r.direction) === "out" ? "out" : "in",
      channel: text(r.channel),
      body: text(r.body),
      fromAddress: text(r.from_address),
      toAddress: text(r.to_address),
      createdAt: text(r.created_at),
      payload: (r.payload && typeof r.payload === "object" ? (r.payload as Record<string, unknown>) : {}) as Record<string, unknown>,
    };
  });
}

export async function findRfqIdByCode(code: string) {
  const db = dataClient();
  if (!db) return null;
  const key = code.trim();
  if (!key) return null;
  const { data, error } = await db.from("trade_rfqs").select("id").eq("code", key).maybeSingle();
  if (error) throw databaseError("find RFQ by code", error);
  return data?.id ? text(data.id) : null;
}

export async function insertWechatQuote(input: {
  supplierId: string;
  kind: "rfq" | "weekly";
  rfqCode?: string;
  productLabel: string;
  specification?: string;
  unitPrice?: string;
  currency?: string;
  quantityMt?: string;
  packing?: string;
  loadPort?: string;
  destinationPort?: string;
  incoterm?: string;
  deliveryWindow?: string;
  isNoOffer?: boolean;
  rawMessage: string;
  extras?: Record<string, unknown>;
}) {
  const db = dataClient();
  if (!db) return;
  const rfqId = input.rfqCode ? await findRfqIdByCode(input.rfqCode) : null;
  const unitPrice = num(String(input.unitPrice || "").replace(/[^\d.]/g, ""));
  const quantityMt = num(String(input.quantityMt || "").replace(/[^\d.]/g, ""));
  const row = {
    kind: input.kind,
    rfq_id: rfqId,
    supplier_id: input.supplierId,
    product_label: input.productLabel || "",
    specification: input.specification || null,
    unit_price: unitPrice,
    currency: input.currency || (unitPrice ? "USD" : "USD"),
    quantity_mt: quantityMt,
    packing: input.packing || null,
    load_port: input.loadPort || null,
    destination_port: input.destinationPort || null,
    incoterm: input.incoterm || null,
    delivery_window: input.deliveryWindow || null,
    status: input.isNoOffer ? "no_offer" : "received",
    source_channel: "wechat",
    is_no_offer: Boolean(input.isNoOffer),
    raw_message: input.rawMessage,
    extras: input.extras ?? {},
  };
  if (rfqId) {
    const { data: existing } = await db
      .from("trade_quotes")
      .select("id")
      .eq("supplier_id", input.supplierId)
      .eq("rfq_id", rfqId)
      .eq("kind", "rfq")
      .not("status", "in", "(superseded,no_offer)")
      .maybeSingle();
    if (existing?.id) {
      const { error } = await db.from("trade_quotes").update(row).eq("id", existing.id);
      if (error) throw databaseError("update WeChat quote", error);
      return;
    }
  }
  const { error } = await db.from("trade_quotes").insert(row);
  if (error) throw databaseError("save WeChat quote", error);
}

export async function logTradeMessage(input: {
  direction: "in" | "out";
  channel: "email" | "whatsapp" | "wechat" | "phone" | "other";
  supplierId?: string;
  buyerId?: string;
  fromAddress?: string;
  toAddress?: string;
  body: string;
  payload?: Record<string, unknown>;
}) {
  const db = dataClient();
  if (!db) return;
  await db.from("trade_messages").insert({
    direction: input.direction,
    channel: input.channel,
    supplier_id: input.supplierId ?? null,
    buyer_id: input.buyerId ?? null,
    from_address: input.fromAddress ?? null,
    to_address: input.toAddress ?? null,
    body: input.body,
    payload: input.payload ?? {},
  });
}

export async function listTradeBuyers(): Promise<TradeBuyer[]> {
  const db = dataClient();
  if (!db) return [];
  const { data, error } = await db.from("trade_buyers").select("*").order("updated_at", { ascending: false });
  if (error) throw databaseError("list buyers", error);
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: text(r.id),
      code: text(r.code),
      companyName: text(r.company_name),
      contactName: text(r.contact_name),
      email: text(r.email),
      whatsappE164: text(r.whatsapp_e164) || null,
      country: text(r.country),
      kycStatus: text(r.kyc_status) || "pending",
      status: text(r.status) || "active",
      createdAt: text(r.created_at),
      updatedAt: text(r.updated_at),
    };
  });
}

export async function listTradeRfqs(): Promise<TradeRfq[]> {
  const db = dataClient();
  if (!db) return [];
  const { data, error } = await db.from("trade_rfq_board").select("*").order("updated_at", { ascending: false });
  if (error) throw databaseError("list RFQs", error);
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: text(r.id),
      code: text(r.code),
      buyerCompany: text(r.buyer_company) || null,
      productLabel: text(r.product_label),
      quantityMt: num(r.quantity_mt),
      packing: text(r.packing),
      incoterm: text(r.incoterm),
      destinationPort: text(r.destination_port),
      destinationCountry: text(r.destination_country),
      shipmentWindow: text(r.shipment_window),
      status: text(r.status),
      buyerReady: Boolean(r.buyer_ready),
      readyQuoteCount: Number(r.ready_quote_count) || 0,
      buyerUnitPrice: num(r.buyer_unit_price),
      supplierUnitPrice: num(r.supplier_unit_price),
      selectedSupplier: text(r.selected_supplier) || null,
      createdAt: text(r.created_at),
      updatedAt: text(r.updated_at),
    };
  });
}

export async function listTradeQuotes(): Promise<TradeQuote[]> {
  const db = dataClient();
  if (!db) return [];
  const { data, error } = await db
    .from("trade_quotes")
    .select("id, code, kind, product_label, unit_price, currency, quantity_mt, load_port, incoterm, status, ready, source_channel, received_at, rfq_id, supplier_id")
    .order("received_at", { ascending: false })
    .limit(500);
  if (error) throw databaseError("list quotes", error);
  const rfqIds = [...new Set((data ?? []).map((row) => row.rfq_id).filter(Boolean))] as string[];
  const supplierIds = [...new Set((data ?? []).map((row) => row.supplier_id).filter(Boolean))] as string[];
  const rfqs = rfqIds.length ? await db.from("trade_rfqs").select("id, code").in("id", rfqIds) : { data: [] };
  const suppliers = supplierIds.length ? await db.from("trade_suppliers").select("id, company_name").in("id", supplierIds) : { data: [] };
  const rfqMap = Object.fromEntries((rfqs.data ?? []).map((row) => [row.id, row.code]));
  const millMap = Object.fromEntries((suppliers.data ?? []).map((row) => [row.id, row.company_name]));
  return (data ?? []).map((row) => ({
    id: text(row.id),
    code: text(row.code) || null,
    kind: text(row.kind),
    rfqCode: row.rfq_id ? text(rfqMap[row.rfq_id as string]) || null : null,
    supplierName: row.supplier_id ? text(millMap[row.supplier_id as string]) || null : null,
    productLabel: text(row.product_label),
    unitPrice: num(row.unit_price),
    currency: text(row.currency) || "USD",
    quantityMt: num(row.quantity_mt),
    loadPort: text(row.load_port),
    incoterm: text(row.incoterm),
    status: text(row.status),
    ready: Boolean(row.ready),
    sourceChannel: text(row.source_channel) || null,
    receivedAt: text(row.received_at),
  }));
}

export async function listTradeFreightQuotes(): Promise<TradeFreightQuote[]> {
  const db = dataClient();
  if (!db) return [];
  const { data, error } = await db
    .from("trade_freight_quotes")
    .select("id, kind, origin_port, destination_port, rate, currency, is_no_offer, received_at")
    .order("received_at", { ascending: false })
    .limit(200);
  if (error) throw databaseError("list freight quotes", error);
  return (data ?? []).map((row) => ({
    id: text(row.id),
    kind: text(row.kind),
    originPort: text(row.origin_port),
    destinationPort: text(row.destination_port),
    rate: num(row.rate),
    currency: text(row.currency) || "USD",
    isNoOffer: Boolean(row.is_no_offer),
    receivedAt: text(row.received_at),
  }));
}

export async function tradeCounts(): Promise<TradeCounts> {
  const empty: TradeCounts = {
    buyers: 0,
    suppliers: 0,
    toInvite: 0,
    invited: 0,
    subscribed: 0,
    rfqs: 0,
    openRfqs: 0,
    quotes: 0,
    readyQuotes: 0,
    freightQuotes: 0,
  };
  const db = dataClient();
  if (!db) return empty;
  const [buyers, suppliers, rfqs, quotes, freight] = await Promise.all([
    db.from("trade_buyers").select("id", { count: "exact", head: true }),
    db.from("trade_suppliers").select("id, onboarding_status"),
    db.from("trade_rfqs").select("id, status"),
    db.from("trade_quotes").select("id, ready", { count: "exact" }).limit(1000),
    db.from("trade_freight_quotes").select("id", { count: "exact", head: true }),
  ]);
  const mills = suppliers.data ?? [];
  const requests = rfqs.data ?? [];
  const offers = quotes.data ?? [];
  return {
    buyers: buyers.count ?? 0,
    suppliers: mills.length,
    toInvite: mills.filter((row) => row.onboarding_status === "to_invite").length,
    invited: mills.filter((row) => row.onboarding_status === "invited").length,
    subscribed: mills.filter((row) => row.onboarding_status === "subscribed").length,
    rfqs: requests.length,
    openRfqs: requests.filter((row) => !["won", "lost", "expired", "closed"].includes(String(row.status))).length,
    quotes: quotes.count ?? offers.length,
    readyQuotes: offers.filter((row) => row.ready).length,
    freightQuotes: freight.count ?? 0,
  };
}
