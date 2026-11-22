/** Member-facing AQ Zero trade book shown under Buy Fertiliser. Sample voyage, matching the buyer screens. */

export type TradeStage = "quote" | "confirmed" | "pre-shipment" | "in-transit" | "arrived" | "completed";

export type TradeDoc = {
  name: string;
  file: string;
  status: "Final" | "Draft" | "Not applicable";
  updated: string;
};

export type JourneyStep = {
  label: string;
  detail: string;
  date: string;
  state: "done" | "now" | "later";
};

export type BuyerTrade = {
  ref: string;
  product: string;
  detail: string;
  quantityMt: number;
  packing: string;
  originCountry: string;
  loadPort: string;
  destination: string;
  dischPort: string;
  stage: TradeStage;
  stageNote: string;
  step?: string;
  shipment: string;
  shipmentNote: string;
  payment: string;
  paymentNote: string;
  docsFinal: number;
  docsTotal: number;
  vessel: string;
  eta: string | null;
  sailed: string | null;
  balanceUsd: number;
  paidUsd: number;
  incoterm: string;
  buyerRef: string;
  confirmed: string;
  price: string;
  closed: string | null;
  journey: JourneyStep[];
  terms: { label: string; value: string }[];
  documents: TradeDoc[];
  updates: { when: string; text: string }[];
  summary?: {
    seller: string;
    buyer: string;
    contract: string;
    shippedMt: string;
    invoiceValue: string;
    received: string;
    paymentTerms: string;
    timeline: { label: string; date: string }[];
  };
};

const PACK = [
  "Sales Contract",
  "Purchase Order",
  "Documentary Instructions",
  "Bagging & Marks Specification",
  "Inspection Certificate (SGS)",
  "Certificate of Analysis",
  "Certificate of Origin",
  "Phytosanitary / Registration",
  "Packing List",
  "Commercial Invoice",
  "Bill of Lading",
  "Insurance Certificate",
];

function docs(ref: string, final: number, draftName?: string): TradeDoc[] {
  return PACK.map((name, index) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (name === "Insurance Certificate" && ref === "AQ-2611-042") {
      return { name, file: "Not required; buyer insures under CFR", status: "Not applicable", updated: "—" };
    }
    if (index < final) return { name, file: `${slug}_${ref}.pdf`, status: "Final", updated: index < 3 ? "12 Oct" : "10 Nov" };
    if (draftName && name === draftName) return { name, file: `${slug}_${ref}_DRAFT-v2.pdf`, status: "Draft", updated: "12 Nov" };
    return { name, file: "Not issued yet", status: "Draft", updated: "—" };
  });
}

export const BUYER_TRADES: BuyerTrade[] = [
  {
    ref: "AQ-2611-042",
    product: "Calcium Nitrate",
    detail: "100 MT · 25 kg PE bags",
    quantityMt: 100,
    packing: "25 kg PE bags, heat-sealed, palletised",
    originCountry: "China",
    loadPort: "Qingdao",
    destination: "Turkey",
    dischPort: "Mersin",
    stage: "in-transit",
    stageNote: "Step 8 of 10 · Sailed 10 Nov",
    step: "8 of 10",
    shipment: "MV Aegean Trader",
    shipmentNote: "ETA 2 Dec · 15 days left",
    payment: "30% paid",
    paymentNote: "Balance due on docs",
    docsFinal: 10,
    docsTotal: 12,
    vessel: "MV Aegean Trader",
    eta: "2026-12-02",
    sailed: "2026-11-10",
    balanceUsd: 22260,
    paidUsd: 9540,
    incoterm: "CFR Mersin",
    buyerRef: "PO-MA-7781",
    confirmed: "12 Oct 2026",
    price: "USD 318.00 / MT",
    closed: null,
    journey: [
      { label: "Quote accepted", detail: "Indicative price agreed on WhatsApp", date: "9 Oct", state: "done" },
      { label: "Trade confirmed", detail: "Email confirmation received", date: "12 Oct", state: "done" },
      { label: "Contract & purchase order issued", detail: "Sales contract signed by both sides", date: "12 Oct", state: "done" },
      { label: "Advance payment received", detail: "USD 9,540.00 · 30% TT", date: "16 Oct", state: "done" },
      { label: "Production & bagging", detail: "25 kg PE bags with your marks", date: "3 Nov", state: "done" },
      { label: "Inspection passed", detail: "SGS quality & weight at load port", date: "5 Nov", state: "done" },
      { label: "Loaded at Qingdao", detail: "4 × 40' HC gross-in and loaded", date: "9 Nov", state: "done" },
      { label: "In transit", detail: "Sailed 10 Nov on MV Aegean Trader · 15 days left", date: "Now", state: "now" },
      { label: "Arrived & discharged at Mersin", detail: "Final docs released for customs clearance", date: "ETA 2 Dec", state: "later" },
      { label: "Balance paid & trade closed", detail: "Trade summary and final doc pack sent", date: "—", state: "later" },
    ],
    terms: [
      { label: "Product", value: "Calcium Nitrate, granular, N 15.5%" },
      { label: "Quantity", value: "100 MT ±5% at seller's option" },
      { label: "Packing", value: "25 kg PE bags, heat-sealed, palletised" },
      { label: "Containers", value: "4 × 40' HC" },
      { label: "Incoterm", value: "CFR Mersin (Incoterms 2020)" },
      { label: "Origin", value: "China" },
      { label: "Load port", value: "Qingdao" },
      { label: "Discharge", value: "Mersin, Turkey" },
      { label: "Inspection", value: "SGS at load port" },
      { label: "Price", value: "USD 318.00 / MT" },
      { label: "Value", value: "USD 31,800.00" },
    ],
    documents: docs("AQ-2611-042", 10, "Bill of Lading"),
    updates: [
      { when: "Thu 12 Nov", text: "Sailed from Qingdao on MV Aegean Trader. Draft bill of lading (v2) shared; final to follow on release." },
      { when: "Tue 10 Nov", text: "Production complete: bagging under way with your marks." },
      { when: "Thu 5 Nov", text: "SGS inspection passed on quality and weight. COA issued." },
    ],
  },
  {
    ref: "AQ-2611-047",
    product: "DAP 18-46-0",
    detail: "500 MT · 50 kg bags",
    quantityMt: 500,
    packing: "50 kg bags",
    originCountry: "Morocco",
    loadPort: "Jorf Lasfar",
    destination: "Turkey",
    dischPort: "Izmir",
    stage: "pre-shipment",
    stageNote: "Step 4 of 10 · Inspection 24 Nov",
    step: "4 of 10",
    shipment: "Vessel to be nominated",
    shipmentNote: "Loading from 28 Nov",
    payment: "Advance due",
    paymentNote: "USD 96,000 by 20 Nov",
    docsFinal: 5,
    docsTotal: 12,
    vessel: "To be nominated",
    eta: null,
    sailed: null,
    balanceUsd: 96000,
    paidUsd: 0,
    incoterm: "CFR Izmir",
    buyerRef: "PO-MA-7802",
    confirmed: "4 Nov 2026",
    price: "USD 640.00 / MT",
    closed: null,
    journey: [
      { label: "Quote accepted", detail: "DAP indication confirmed", date: "1 Nov", state: "done" },
      { label: "Trade confirmed", detail: "Email confirmation received", date: "4 Nov", state: "done" },
      { label: "Contract issued", detail: "Sales contract with both sides", date: "6 Nov", state: "done" },
      { label: "Inspection booked", detail: "SGS for 24 Nov at Jorf Lasfar", date: "Now", state: "now" },
      { label: "Advance due", detail: "USD 96,000 · 30% by 20 Nov", date: "20 Nov", state: "later" },
      { label: "Loading", detail: "Laycan from 28 Nov", date: "28 Nov", state: "later" },
    ],
    terms: [
      { label: "Product", value: "DAP 18-46-0" },
      { label: "Quantity", value: "500 MT" },
      { label: "Packing", value: "50 kg bags" },
      { label: "Origin", value: "Morocco" },
      { label: "Load port", value: "Jorf Lasfar" },
      { label: "Discharge", value: "Izmir, Turkey" },
      { label: "Incoterm", value: "CFR Izmir" },
      { label: "Price", value: "USD 640.00 / MT" },
    ],
    documents: docs("AQ-2611-047", 5),
    updates: [{ when: "Tue 10 Nov", text: "Inspection booked with SGS for 24 Nov at Jorf Lasfar. Bag marks confirmed." }],
  },
  {
    ref: "AQ-2611-050",
    product: "Urea 46% granular",
    detail: "3,000 MT · Bulk",
    quantityMt: 3000,
    packing: "Bulk",
    originCountry: "Egypt",
    loadPort: "Damietta",
    destination: "Turkey",
    dischPort: "Iskenderun",
    stage: "confirmed",
    stageNote: "Step 2 of 10 · Contract issued",
    step: "2 of 10",
    shipment: "Vessel to be nominated",
    shipmentNote: "Laycan 5–15 Dec",
    payment: "Not invoiced",
    paymentNote: "LC to be opened",
    docsFinal: 2,
    docsTotal: 12,
    vessel: "To be nominated",
    eta: null,
    sailed: null,
    balanceUsd: 0,
    paidUsd: 0,
    incoterm: "CFR Iskenderun",
    buyerRef: "PO-MA-7810",
    confirmed: "8 Nov 2026",
    price: "USD 395.00 / MT",
    closed: null,
    journey: [
      { label: "Quote accepted", detail: "Urea 46% granular, bulk", date: "6 Nov", state: "done" },
      { label: "Contract issued", detail: "Sales contract sent for signature", date: "Now", state: "now" },
      { label: "LC to be opened", detail: "Irrevocable LC at sight", date: "—", state: "later" },
      { label: "Vessel nominated", detail: "Laycan 5–15 Dec", date: "—", state: "later" },
    ],
    terms: [
      { label: "Product", value: "Urea 46% N, granular" },
      { label: "Quantity", value: "3,000 MT · Bulk" },
      { label: "Origin", value: "Egypt" },
      { label: "Load port", value: "Damietta" },
      { label: "Discharge", value: "Iskenderun, Turkey" },
      { label: "Incoterm", value: "CFR Iskenderun" },
      { label: "Laycan", value: "5–15 Dec" },
    ],
    documents: docs("AQ-2611-050", 2),
    updates: [{ when: "Tue 10 Nov", text: "Sales contract and purchase order issued. Documentary instructions received." }],
  },
  {
    ref: "AQ-2611-053",
    product: "TSP 46%",
    detail: "250 MT · 50 kg bags",
    quantityMt: 250,
    packing: "50 kg bags",
    originCountry: "China",
    loadPort: "Lianyungang",
    destination: "Turkey",
    dischPort: "Mersin",
    stage: "quote",
    stageNote: "Quote sent 16 Nov",
    shipment: "—",
    shipmentNote: "Quote valid to 19 Nov",
    payment: "No invoice",
    paymentNote: "Quote only",
    docsFinal: 1,
    docsTotal: 1,
    vessel: "—",
    eta: null,
    sailed: null,
    balanceUsd: 0,
    paidUsd: 0,
    incoterm: "CFR Mersin",
    buyerRef: "",
    confirmed: "",
    price: "On request",
    closed: null,
    journey: [{ label: "Quote sent", detail: "Valid to 19 Nov. Reply on WhatsApp or email to confirm.", date: "16 Nov", state: "now" }],
    terms: [
      { label: "Product", value: "TSP 46%" },
      { label: "Quantity", value: "250 MT · 50 kg bags" },
      { label: "Origin", value: "China" },
      { label: "Load port", value: "Lianyungang" },
      { label: "Discharge", value: "Mersin, Turkey" },
    ],
    documents: [{ name: "Quote", file: `quote_${"AQ-2611-053"}.pdf`, status: "Draft", updated: "16 Nov" }],
    updates: [{ when: "Sun 16 Nov", text: "TSP quote AQ-2611-053 sent. Valid to 19 Nov." }],
  },
  {
    ref: "AQ-2609-018",
    product: "NPK 19-19-19",
    detail: "50 MT",
    quantityMt: 50,
    packing: "25 kg bags",
    originCountry: "China",
    loadPort: "Qingdao",
    destination: "Turkey",
    dischPort: "Mersin",
    stage: "completed",
    stageNote: "Closed 30 Oct",
    shipment: "Completed",
    shipmentNote: "Paid in full",
    payment: "Paid",
    paymentNote: "Balance USD 0",
    docsFinal: 11,
    docsTotal: 11,
    vessel: "MV Sample Bay",
    eta: "2026-10-12",
    sailed: "2026-09-28",
    balanceUsd: 0,
    paidUsd: 28500,
    incoterm: "CFR Mersin",
    buyerRef: "PO-MA-7610",
    confirmed: "2 Sep 2026",
    price: "USD 570.00 / MT",
    closed: "30 Oct 2026",
    journey: [{ label: "Trade complete", detail: "Paid in full. Final pack on file.", date: "30 Oct", state: "done" }],
    terms: [
      { label: "Product", value: "NPK 19-19-19" },
      { label: "Quantity", value: "50 MT" },
      { label: "Discharge", value: "Mersin, Turkey" },
    ],
    documents: docs("AQ-2609-018", 11).slice(0, 11),
    updates: [{ when: "30 Oct", text: "Trade closed. Final document pack filed." }],
    summary: {
      seller: "Aquifert",
      buyer: "Marmara Agri",
      contract: "Sales-Contract_AQ-2609-018",
      shippedMt: "50 MT",
      invoiceValue: "USD 28,500.00",
      received: "USD 28,500.00 · 28 Oct 2026",
      paymentTerms: "TT against documents",
      timeline: [
        { label: "Confirmed", date: "2 Sep" },
        { label: "Loaded", date: "26 Sep" },
        { label: "Arrived", date: "12 Oct" },
        { label: "Paid & closed", date: "30 Oct" },
      ],
    },
  },
  {
    ref: "AQ-2608-011",
    product: "Urea 46%",
    detail: "1,000 MT",
    quantityMt: 1000,
    packing: "Bulk",
    originCountry: "Egypt",
    loadPort: "Damietta",
    destination: "Turkey",
    dischPort: "Iskenderun",
    stage: "completed",
    stageNote: "Closed 9 Oct",
    shipment: "MV Nile Horizon",
    shipmentNote: "Discharged 22 Sep",
    payment: "Paid",
    paymentNote: "Balance USD 0.00",
    docsFinal: 12,
    docsTotal: 12,
    vessel: "MV Nile Horizon",
    eta: "2026-09-19",
    sailed: "2026-09-13",
    balanceUsd: 0,
    paidUsd: 396343,
    incoterm: "CIF Iskenderun",
    buyerRef: "PO-MA-7702",
    confirmed: "18 Aug 2026",
    price: "USD 395.00 / MT CIF Iskenderun",
    closed: "9 Oct 2026",
    journey: [{ label: "Trade complete", detail: "Paid in full. Final pack stays on file.", date: "9 Oct", state: "done" }],
    terms: [
      { label: "Product", value: "Urea 46% N, granular" },
      { label: "Packing", value: "Bulk" },
      { label: "Contract quantity", value: "1,000 MT ±5%" },
      { label: "Shipped (B/L)", value: "1,003.400 MT" },
      { label: "Origin", value: "Egypt" },
      { label: "Load port", value: "Damietta" },
      { label: "Discharge port", value: "Iskenderun, Turkey" },
      { label: "Vessel", value: "MV Nile Horizon" },
      { label: "Incoterm", value: "CIF Iskenderun" },
      { label: "Inspection", value: "SGS · quality & draft survey" },
    ],
    documents: docs("AQ-2608-011", 12),
    updates: [{ when: "9 Oct", text: "Balance cleared. Trade summary issued." }],
    summary: {
      seller: "Aquifert",
      buyer: "Marmara Agri",
      contract: "Sales-Contract_AQ-2608-011",
      shippedMt: "1,003.400 MT",
      invoiceValue: "USD 396,343.00",
      received: "USD 396,343.00 · 6 Oct 2026",
      paymentTerms: "Irrevocable LC at sight",
      timeline: [
        { label: "Confirmed", date: "18 Aug" },
        { label: "Inspected", date: "10 Sep" },
        { label: "Loaded", date: "12 Sep" },
        { label: "Sailed", date: "13 Sep" },
        { label: "Arrived", date: "19 Sep" },
        { label: "Discharged", date: "22 Sep" },
        { label: "Paid & closed", date: "9 Oct" },
      ],
    },
  },
];

export const STAGE_ORDER: TradeStage[] = ["quote", "confirmed", "pre-shipment", "in-transit", "arrived", "completed"];

export function stageLabel(stage: TradeStage) {
  if (stage === "in-transit") return "In transit";
  if (stage === "pre-shipment") return "Pre-shipment";
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

export function tradeByRef(ref: string) {
  return BUYER_TRADES.find((trade) => trade.ref === ref);
}

export function money(usd: number) {
  return `USD ${Math.round(usd).toLocaleString("en-GB")}`;
}

export function activeTrades() {
  return BUYER_TRADES.filter((trade) => trade.stage !== "completed");
}

export function routeLabel(trade: BuyerTrade) {
  return `${trade.originCountry} · ${trade.loadPort} to ${trade.dischPort}, ${trade.destination === "Turkey" ? "TR" : trade.destination}`;
}
