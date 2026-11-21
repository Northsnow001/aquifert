import "server-only";

import { dataClient, databaseError } from "@/lib/data/db";
import type {
  OnboardingStatus,
  TradeAgent,
  TradeBuyer,
  TradeBuyerDraft,
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

export async function deleteTradeSuppliers(ids: string[]) {
  const db = dataClient();
  if (!db) throw new Error("Supabase is not configured.");
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return 0;
  for (let i = 0; i < unique.length; i += 80) {
    const { error } = await db.from("trade_suppliers").delete().in("id", unique.slice(i, i + 80));
    if (error) throw databaseError("delete suppliers", error);
  }
  return unique.length;
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
  return listTradeThread({ channel: "wechat", supplierId: input.supplierId, address: input.openid });
}

/** Messages on this number that are not yet tied to a buyer row — a fresh unknown chat. */
export async function listOrphanWhatsAppThread(phone: string): Promise<TradeMessage[]> {
  const db = dataClient();
  if (!db) return [];
  const address = e164(phone) || phone.trim();
  if (!address) return [];
  const { data, error } = await db
    .from("trade_messages")
    .select("*")
    .eq("channel", "whatsapp")
    .is("buyer_id", null)
    .or(`from_address.eq.${address},to_address.eq.${address}`)
    .order("created_at", { ascending: true })
    .limit(40);
  if (error) throw databaseError("list unknown WhatsApp thread", error);
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

export async function listTradeThread(input: {
  channel: "wechat" | "whatsapp";
  supplierId?: string | null;
  buyerId?: string | null;
  address?: string | null;
}): Promise<TradeMessage[]> {
  const db = dataClient();
  if (!db) return [];
  const supplierId = input.supplierId?.trim() || "";
  const buyerId = input.buyerId?.trim() || "";
  const address = input.address?.trim() || "";
  if (!supplierId && !buyerId && !address) return [];
  let query = db.from("trade_messages").select("*").eq("channel", input.channel).order("created_at", { ascending: true }).limit(400);
  const parts: string[] = [];
  if (supplierId) parts.push(`supplier_id.eq.${supplierId}`);
  if (buyerId) parts.push(`buyer_id.eq.${buyerId}`);
  if (address) parts.push(`from_address.eq.${address}`, `to_address.eq.${address}`);
  if (parts.length) query = query.or(parts.join(","));
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

export async function getTradeRfqByCode(code: string) {
  const db = dataClient();
  if (!db) return null;
  const key = code.trim();
  if (!key) return null;
  const { data, error } = await db
    .from("trade_rfqs")
    .select("id, code, product_label, specification, quantity_mt, packing, incoterm, destination_port, destination_country, shipment_window, status, extras")
    .eq("code", key)
    .maybeSingle();
  if (error) throw databaseError("load RFQ by code", error);
  return data ? (data as Record<string, unknown>) : null;
}

export async function getLatestBuyerRfq(buyerId: string) {
  const db = dataClient();
  if (!db) return null;
  const { data, error } = await db
    .from("trade_rfqs")
    .select("id, code, product_label, specification, quantity_mt, packing, incoterm, destination_port, destination_country, shipment_window, status, extras")
    .eq("buyer_id", buyerId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw databaseError("load latest buyer RFQ", error);
  return data ? (data as Record<string, unknown>) : null;
}

export async function patchTradeRfq(
  id: string,
  patch: {
    status?: string;
    extras?: Record<string, unknown>;
    productLabel?: string;
    specification?: string;
    quantityMt?: string;
    packing?: string;
    destinationPort?: string;
    destinationCountry?: string;
    incoterm?: string;
    shipmentWindow?: string;
    rawMessage?: string;
  },
) {
  const db = dataClient();
  if (!db) throw new Error("Supabase is not configured.");
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status) body.status = patch.status;
  if (patch.extras) body.extras = patch.extras;
  if (patch.productLabel != null) body.product_label = patch.productLabel;
  if (patch.specification != null) body.specification = patch.specification || null;
  if (patch.quantityMt != null) {
    const qty = num(String(patch.quantityMt).replace(/[^\d.]/g, ""));
    if (qty && qty > 0) body.quantity_mt = qty;
  }
  if (patch.packing != null) body.packing = patch.packing || null;
  if (patch.destinationPort != null) body.destination_port = patch.destinationPort || null;
  if (patch.destinationCountry != null) body.destination_country = patch.destinationCountry || null;
  if (patch.incoterm != null) body.incoterm = patch.incoterm || null;
  if (patch.shipmentWindow != null) body.shipment_window = patch.shipmentWindow || null;
  if (patch.rawMessage != null) body.raw_message = patch.rawMessage;
  const { error } = await db.from("trade_rfqs").update(body).eq("id", id);
  if (error) throw databaseError("update RFQ", error);
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

const CLOSED_RFQ = new Set(["won", "lost", "expired", "closed"]);

export async function listTradeBuyers(): Promise<TradeBuyer[]> {
  const db = dataClient();
  if (!db) return [];
  const [{ data, error }, rfqs] = await Promise.all([
    db.from("trade_buyers").select("*").order("updated_at", { ascending: false }),
    db.from("trade_rfqs").select("buyer_id, status, created_at, updated_at"),
  ]);
  if (error) throw databaseError("list buyers", error);
  const stats = new Map<string, { enquiryCount: number; openTrades: number; lastEnquiryAt: string | null }>();
  for (const item of rfqs.error ? [] : rfqs.data ?? []) {
    const row = item as Record<string, unknown>;
    const id = text(row.buyer_id);
    if (!id) continue;
    const current = stats.get(id) ?? { enquiryCount: 0, openTrades: 0, lastEnquiryAt: null as string | null };
    current.enquiryCount += 1;
    if (!CLOSED_RFQ.has(text(row.status))) current.openTrades += 1;
    const at = text(row.updated_at) || text(row.created_at);
    if (at && (!current.lastEnquiryAt || at > current.lastEnquiryAt)) current.lastEnquiryAt = at;
    stats.set(id, current);
  }
  return (data ?? []).map((row) => {
    const buyer = buyerFrom(row as Record<string, unknown>);
    const extra = stats.get(buyer.id);
    return extra ? { ...buyer, ...extra } : buyer;
  });
}

function buyerFrom(row: Record<string, unknown>): TradeBuyer {
  return {
    id: text(row.id),
    code: text(row.code),
    companyName: text(row.company_name),
    contactName: text(row.contact_name),
    email: text(row.email),
    whatsappE164: text(row.whatsapp_e164) || null,
    wechatId: text(row.wechat_id),
    country: text(row.country),
    address: text(row.address),
    jobTitle: text(row.job_title),
    buyerType: text(row.buyer_type),
    productsOfInterest: text(row.products_of_interest),
    kycStatus: text(row.kyc_status) || "pending",
    status: text(row.status) || "active",
    partnerName: text(row.partner_name),
    partnerEmail: text(row.partner_email),
    onboardingStatus: onboarding(row.onboarding_status),
    invitedAt: text(row.invited_at) || null,
    lastContactAt: text(row.last_contact_at) || null,
    notes: text(row.notes),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    enquiryCount: 0,
    openTrades: 0,
    lastEnquiryAt: null,
  };
}

function buyerWrite(input: TradeBuyerDraft) {
  const phone = e164(input.phone);
  return {
    company_name: input.companyName.trim(),
    contact_name: input.contactName.trim() || null,
    job_title: input.jobTitle.trim() || null,
    email: input.email.trim().toLowerCase() || null,
    whatsapp_e164: phone,
    wechat_id: input.wechatId?.trim() || null,
    country: input.country.trim() || null,
    address: input.address.trim() || null,
    buyer_type: input.buyerType.trim() || null,
    products_of_interest: input.productsOfInterest.trim() || null,
    notes: input.notes.trim() || null,
    partner_name: input.partnerName?.trim() || null,
    partner_email: input.partnerEmail?.trim().toLowerCase() || null,
  };
}

export async function getTradeBuyer(id: string): Promise<TradeBuyer | null> {
  const db = dataClient();
  if (!db) return null;
  const { data, error } = await db.from("trade_buyers").select("*").eq("id", id).maybeSingle();
  if (error) throw databaseError("read buyer", error);
  return data ? buyerFrom(data as Record<string, unknown>) : null;
}

export async function getTradeBuyerByWhatsApp(phone: string): Promise<TradeBuyer | null> {
  const db = dataClient();
  if (!db) return null;
  const e164Phone = e164(phone);
  if (!e164Phone) return null;
  const { data, error } = await db.from("trade_buyers").select("*").eq("whatsapp_e164", e164Phone).maybeSingle();
  if (error) throw databaseError("read buyer by WhatsApp", error);
  return data ? buyerFrom(data as Record<string, unknown>) : null;
}

export async function getTradeBuyerByEmail(email: string): Promise<TradeBuyer | null> {
  const db = dataClient();
  if (!db) return null;
  const key = email.trim().toLowerCase();
  if (!key) return null;
  const { data, error } = await db.from("trade_buyers").select("*").eq("email", key).maybeSingle();
  if (error) throw databaseError("read buyer by email", error);
  return data ? buyerFrom(data as Record<string, unknown>) : null;
}

export async function insertTradeBuyer(input: TradeBuyerDraft) {
  const db = dataClient();
  if (!db) throw new Error("Supabase is not configured.");
  const { data: code, error: codeError } = await db.rpc("trade_next_code", {
    counter_key: "next_buyer_number",
    prefix: "B-",
    pad: 3,
  });
  if (codeError) throw databaseError("allocate buyer code", codeError);
  const body = buyerWrite(input);
  const { data, error } = await db
    .from("trade_buyers")
    .insert({
      code: String(code),
      ...body,
      status: "active",
      kyc_status: "pending",
      onboarding_status: input.linkedOnWhatsApp ? "subscribed" : "to_invite",
    })
    .select("*")
    .single();
  if (error) throw databaseError("create buyer", error);
  return buyerFrom(data as Record<string, unknown>);
}

async function deleteBuyerWhatsAppMemory(db: NonNullable<ReturnType<typeof dataClient>>, buyerIds: string[], phones: string[]) {
  for (let i = 0; i < buyerIds.length; i += 80) {
    const { error } = await db.from("trade_messages").delete().in("buyer_id", buyerIds.slice(i, i + 80));
    if (error) throw databaseError("delete buyer chat history", error);
  }
  for (const phone of phones) {
    const { error } = await db
      .from("trade_messages")
      .delete()
      .eq("channel", "whatsapp")
      .or(`from_address.eq.${phone},to_address.eq.${phone}`);
    if (error) throw databaseError("delete WhatsApp thread for number", error);
  }
}

export async function deleteTradeBuyers(ids: string[]) {
  const db = dataClient();
  if (!db) throw new Error("Supabase is not configured.");
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return 0;
  const { data: rows, error: readError } = await db.from("trade_buyers").select("id, whatsapp_e164").in("id", unique);
  if (readError) throw databaseError("read buyers before delete", readError);
  const phones = [
    ...new Set(
      (rows ?? [])
        .map((row) => e164(text((row as Record<string, unknown>).whatsapp_e164)))
        .filter((phone): phone is string => Boolean(phone)),
    ),
  ];
  await deleteBuyerWhatsAppMemory(db, unique, phones);
  for (let i = 0; i < unique.length; i += 80) {
    const { error } = await db.from("trade_buyers").delete().in("id", unique.slice(i, i + 80));
    if (error) throw databaseError("delete buyers", error);
  }
  return unique.length;
}

export async function updateTradeBuyer(id: string, input: TradeBuyerDraft) {
  const db = dataClient();
  if (!db) throw new Error("Supabase is not configured.");
  const body = buyerWrite(input);
  const patch: Record<string, unknown> = { ...body };
  if (!body.whatsapp_e164) delete patch.whatsapp_e164;
  const { data, error } = await db.from("trade_buyers").update(patch).eq("id", id).select("*").single();
  if (error) throw databaseError("update buyer", error);
  return buyerFrom(data as Record<string, unknown>);
}

export async function markBuyerOnWhatsApp(id: string, phone: string) {
  const db = dataClient();
  if (!db) throw new Error("Supabase is not configured.");
  const e164Phone = e164(phone);
  if (!e164Phone) throw new Error("A WhatsApp number is required.");
  const { data, error } = await db
    .from("trade_buyers")
    .update({
      whatsapp_e164: e164Phone,
      onboarding_status: "subscribed",
      last_contact_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw databaseError("mark buyer on WhatsApp", error);
  return buyerFrom(data as Record<string, unknown>);
}

export async function markBuyerInvited(id: string, email: string) {
  const db = dataClient();
  if (!db) throw new Error("Supabase is not configured.");
  const now = new Date().toISOString();
  const current = await getTradeBuyer(id);
  const { data, error } = await db
    .from("trade_buyers")
    .update({
      onboarding_status: current?.onboardingStatus === "subscribed" ? "subscribed" : "invited",
      invited_at: now,
      invited_email: email,
      last_contact_at: now,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw databaseError("mark buyer invited", error);
  return buyerFrom(data as Record<string, unknown>);
}

export async function linkBuyerWhatsApp(input: { phone: string; email: string }) {
  const db = dataClient();
  if (!db) throw new Error("Supabase is not configured.");
  const email = input.email.trim().toLowerCase();
  const phone = e164(input.phone);
  if (!email || !phone) return { ok: false as const, error: "phone and email are required." };
  const { data: rows, error: lookupError } = await db
    .from("trade_buyers")
    .select("*")
    .or(`email.eq.${email},invited_email.eq.${email}`)
    .limit(5);
  if (lookupError) throw databaseError("find buyer for WhatsApp start", lookupError);
  const match = (rows ?? []).find((row) => {
    const r = row as Record<string, unknown>;
    return [r.email, r.invited_email].some((value) => String(value ?? "").trim().toLowerCase() === email);
  });
  if (!match) return { ok: false as const, unmatched: true as const, error: "No buyer with that invite email." };
  const { data, error } = await db
    .from("trade_buyers")
    .update({
      whatsapp_e164: phone,
      onboarding_status: "subscribed",
      last_contact_at: new Date().toISOString(),
    })
    .eq("id", String((match as { id: string }).id))
    .select("*")
    .single();
  if (error) throw databaseError("link buyer WhatsApp", error);
  const buyer = buyerFrom(data as Record<string, unknown>);
  await logTradeMessage({
    direction: "in",
    channel: "whatsapp",
    buyerId: buyer.id,
    fromAddress: phone,
    toAddress: email,
    body: "WhatsApp invite",
    payload: { event: "start", phone, email },
  });
  return { ok: true as const, buyer };
}

function sameName(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export async function linkBuyerWhatsAppFromHello(input: { phone: string; name: string; company: string }) {
  const db = dataClient();
  if (!db) throw new Error("Supabase is not configured.");
  const phone = e164(input.phone);
  const company = input.company.trim();
  const name = input.name.trim();
  if (!phone || !company || !name) return { ok: false as const, unmatched: true as const, error: "name and company are required." };
  const { data: rows, error: lookupError } = await db
    .from("trade_buyers")
    .select("*")
    .ilike("company_name", company)
    .in("onboarding_status", ["to_invite", "invited", "subscribed"])
    .limit(20);
  if (lookupError) throw databaseError("find buyer for WhatsApp hello", lookupError);
  const matches = (rows ?? []).filter((row) => {
    const r = row as Record<string, unknown>;
    return sameName(text(r.contact_name), name) && sameName(text(r.company_name), company);
  });
  const match = matches.length === 1 ? matches[0] : null;
  if (!match) return { ok: false as const, unmatched: true as const, error: "No invited buyer matches that name and company." };
  const { data, error } = await db
    .from("trade_buyers")
    .update({
      whatsapp_e164: phone,
      onboarding_status: "subscribed",
      last_contact_at: new Date().toISOString(),
    })
    .eq("id", String((match as { id: string }).id))
    .select("*")
    .single();
  if (error) throw databaseError("link buyer WhatsApp", error);
  const buyer = buyerFrom(data as Record<string, unknown>);
  await logTradeMessage({
    direction: "in",
    channel: "whatsapp",
    buyerId: buyer.id,
    fromAddress: phone,
    toAddress: buyer.email,
    body: "WhatsApp invite",
    payload: { event: "start", phone, name, company },
  });
  return { ok: true as const, buyer };
}

export async function insertWhatsAppRfq(input: {
  buyerId: string;
  productLabel: string;
  specification?: string;
  quantityMt?: string;
  packing?: string;
  destinationPort?: string;
  destinationCountry?: string;
  incoterm?: string;
  shipmentWindow?: string;
  rawMessage: string;
  extras?: Record<string, unknown>;
  status?: "collecting" | "open";
}) {
  const db = dataClient();
  if (!db) throw new Error("Supabase is not configured.");
  const { data: code, error: codeError } = await db.rpc("trade_next_code", {
    counter_key: "next_rfq_number",
    prefix: "rfq#",
    pad: 3,
  });
  if (codeError) throw databaseError("allocate RFQ code", codeError);
  const qty = num(String(input.quantityMt || "").replace(/[^\d.]/g, ""));
  const { data, error } = await db
    .from("trade_rfqs")
    .insert({
      code: String(code),
      buyer_id: input.buyerId,
      product_label: input.productLabel || "",
      specification: input.specification || null,
      quantity_mt: qty,
      packing: input.packing || null,
      destination_port: input.destinationPort || null,
      destination_country: input.destinationCountry || null,
      incoterm: input.incoterm || null,
      shipment_window: input.shipmentWindow || null,
      source_channel: "whatsapp",
      status: input.status === "open" ? "open" : "collecting",
      raw_message: input.rawMessage,
      extras: input.extras ?? {},
    })
    .select("id, code")
    .single();
  if (error) throw databaseError("save WhatsApp RFQ", error);
  return { id: text(data.id), code: text(data.code) };
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
