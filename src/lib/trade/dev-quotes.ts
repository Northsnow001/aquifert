import "server-only";

import { DESK_QUOTE_TARGET } from "@/lib/trade/desk-closer-logic";
import {
  getTradeRfqRecord,
  insertTradeSupplier,
  insertWechatQuote,
  listDeskCandidateQuotes,
  listLiveRfqQuoteKeys,
  listTradeSuppliers,
  skipSupplierInvite,
  upsertRfqAsk,
} from "@/lib/trade/store";
import { tradeDevToolsEnabled } from "@/lib/trade/trade-dev";

const PORTS = ["Qingdao", "Tianjin", "Lianyungang", "Zhangjiagang", "Dalian", "Rizhao", "Nanjing", "Shanghai"];
const HOUSES = ["Nutrients", "Chem", "Fertiliser", "Agro", "Minerals", "Phosphate", "Potash", "Urea"];

function text(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function num(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function nextPrice(used: Set<number>, seed: number) {
  let price = Math.round(seed);
  while (used.has(price) || price <= 0) price += 7;
  used.add(price);
  return price;
}

function nextPort(used: Set<string>, index: number) {
  for (let i = 0; i < PORTS.length; i++) {
    const port = PORTS[(index + i) % PORTS.length];
    if (!used.has(port.toLowerCase())) {
      used.add(port.toLowerCase());
      return port;
    }
  }
  const port = `${PORTS[index % PORTS.length]} ${index + 1}`;
  used.add(port.toLowerCase());
  return port;
}

export async function generateDevSupplierQuotes(rfqId: string, addCount = DESK_QUOTE_TARGET) {
  if (!tradeDevToolsEnabled()) throw new Error("Dev quote tools are off.");
  const need = Math.min(8, Math.max(1, Math.floor(Number(addCount) || DESK_QUOTE_TARGET)));
  const rfq = await getTradeRfqRecord(rfqId);
  if (!rfq) throw new Error("Buyer request not found. Pick an RFQ such as rfq#078.");
  const live = await listLiveRfqQuoteKeys(rfqId);
  const quoted = new Set(live.supplierIds);
  const usedPrices = new Set(live.prices.map((price) => Math.round(price)));
  const usedPorts = new Set(live.loadPorts.map((port) => port.toLowerCase()));
  const uniqueNow = (await listDeskCandidateQuotes(rfqId)).reduce((set, row) => {
    if (row.supplierId) set.add(row.supplierId);
    return set;
  }, new Set<string>());

  const product = text(rfq.product_label) || "Urea";
  const qty = num(rfq.quantity_mt) || 300;
  const packing = text(rfq.packing) || "50kg bags";
  const incoterm = text(rfq.incoterm) || "FOB";
  const dest = text(rfq.destination_port) || text(rfq.destination_country);
  const window = text(rfq.shipment_window);
  const code = text(rfq.code);
  const seedPrice = usedPrices.size ? Math.min(...usedPrices) : 385;

  const unused = (await listTradeSuppliers()).filter((row) => row.id && !quoted.has(row.id));
  unused.sort((a, b) => {
    const aDev = a.companyName.startsWith("DEV ") ? 1 : 0;
    const bDev = b.companyName.startsWith("DEV ") ? 1 : 0;
    return aDev - bDev;
  });

  let reusedSuppliers = 0;
  let mintedSuppliers = 0;
  let created = 0;
  const stamp = Date.now().toString(36);

  for (let i = 0; i < need; i++) {
    let supplier = unused.shift() ?? null;
    if (!supplier) {
      const house = HOUSES[i % HOUSES.length];
      const portHint = PORTS[i % PORTS.length];
      supplier = await insertTradeSupplier({
        companyName: `DEV ${portHint} ${house} ${stamp}-${i + 1}`,
        contactName: "Dev desk",
        email: `dev-quote-${stamp}-${i}@aquifert.dev`,
        phone: "",
        country: "China",
        address: "",
        productsSupplied: product,
        origins: "China",
        loadPorts: portHint,
        paymentTerms: "",
        notes: "DEV generated supplier — testing quotes only. Safe to delete.",
      });
      await skipSupplierInvite(supplier.id).catch(() => undefined);
      mintedSuppliers += 1;
    } else reusedSuppliers += 1;

    quoted.add(supplier.id);
    const price = nextPrice(usedPrices, seedPrice + (i + 1) * 9);
    const loadPort = supplier.loadPorts[0] && !usedPorts.has(supplier.loadPorts[0].toLowerCase())
      ? supplier.loadPorts[0]
      : nextPort(usedPorts, i);
    const raw = [
      `${code || "RFQ"}`,
      `${product} ${price} USD/MT ${incoterm} ${loadPort}`,
      qty ? `${qty} MT` : "",
      packing,
      dest ? `dest ${dest}` : "",
      window,
      "(generated for desk testing)",
    ]
      .filter(Boolean)
      .join(" · ");

    await insertWechatQuote({
      supplierId: supplier.id,
      kind: "rfq",
      rfqCode: code || undefined,
      productLabel: product,
      specification: text(rfq.specification),
      unitPrice: String(price),
      currency: "USD",
      quantityMt: String(qty),
      packing,
      origin: supplier.origins[0] || "China",
      loadPort,
      destinationPort: dest,
      incoterm,
      deliveryWindow: window,
      rawMessage: raw,
      sourceChannel: "dev",
      extras: {
        generated: true,
        generated_at: new Date().toISOString(),
        rfq_code: code,
      },
    });
    await upsertRfqAsk({ rfqId, supplierId: supplier.id, status: "quoted", extras: { generated: true } }).catch(() => undefined);
    created += 1;
  }

  const unique = uniqueNow.size + created;
  return {
    created,
    unique,
    rfqId,
    rfqCode: code,
    reusedSuppliers,
    mintedSuppliers,
  };
}
