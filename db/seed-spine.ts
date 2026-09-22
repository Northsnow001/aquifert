/**
 * Trade-spine demo seed, run with: npx tsx db/seed-spine.ts
 * Idempotent: skips if protected_entities already populated.
 * Adds: back-to-back trade fields, protected-entity sets, gated documents
 * (incl. two demo leaks), a pending per-buyer margin review, freight bids.
 */
import "dotenv/config";
import { getDb } from "../server/queries/connection";
import * as s from "./schema";
import { asc, eq } from "drizzle-orm";
import { scanText, type ProtectedEntityInput } from "../server/lib/firewall";

async function main() {
  const db = getDb();
  const existing = await db.select().from(s.protectedEntities).limit(1);
  if (existing.length > 0) {
    console.log("Spine seed skipped, already present.");
    return;
  }

  const orders = await db.select().from(s.orders).orderBy(asc(s.orders.id)).limit(4);
  if (orders.length < 2) throw new Error("Need at least 2 seeded orders first (run db/seed.ts)");
  const [t1, t2] = orders;

  /* ---------- per-buyer margin profiles (margin varies per buyer) ---------- */
  const buyerOrgs = await db.select().from(s.organizations).where(eq(s.organizations.type, "BUYER"));
  const profiles = [8, 10.5, 12, 7.5, 9.25];
  for (let i = 0; i < buyerOrgs.length; i++) {
    await db.update(s.organizations).set({ marginProfilePct: profiles[i % profiles.length] }).where(eq(s.organizations.id, buyerOrgs[i].id));
  }
  console.log(`Margin profiles set on ${buyerOrgs.length} buyer orgs.`);

  /* ---------- trade 1: TRADITIONAL margin trade, mid-lifecycle ---------- */
  await db.update(s.orders).set({
    tradeRef: "AQ-TE-08-06-000617",
    dealType: "TRADITIONAL",
    tradeStage: 8,
    stageHistory: [
      { stage: 1, note: "Enquiry received via WhatsApp", actor: "AQUIFERT AI", at: new Date(Date.now() - 20 * 864e5).toISOString() },
      { stage: 4, note: "Firm offer released after human approval", actor: "Ops", at: new Date(Date.now() - 16 * 864e5).toISOString() },
      { stage: 7, note: "Back-to-back contracts signed", actor: "Ops", at: new Date(Date.now() - 10 * 864e5).toISOString() },
      { stage: 8, note: "Margin under review", actor: "AQUIFERT AI", at: new Date().toISOString() },
    ],
    buyContractRef: "WGR-DEMO-0612",
    sellContractRef: "AQ-TE-08-06-000617",
    buySpec: "Fe 19.7% min",
    sellSpec: "Fe 19% min",
    buyQtyMt: 48,
    sellQtyMt: 50,
    tolerancePct: 10,
    buyPricePerMt: 300,
    freightPerMt: 150,
    tradeCurrency: "USD",
    inspectionBasis: "SELLER_CERT",
    documentaryInstructions: "Commercial invoice, packing list, COA, COO, phytosanitary cert for wooden pallets, REACH statement. All docs to name Aquifert Limited as shipper.",
  }).where(eq(s.orders.id, t1.id));

  /* ---------- trade 2: AQ ZERO, earlier stage ---------- */
  await db.update(s.orders).set({
    tradeRef: "AQ-TE-08-06-000622",
    dealType: "AQ_ZERO",
    tradeStage: 10,
    buySpec: "Total N 46.3% min",
    sellSpec: "Total N 46% min",
    buyQtyMt: 100,
    sellQtyMt: 100,
    tolerancePct: 5,
    buyPricePerMt: 314,
    freightPerMt: 59,
    sellPricePerMt: 373,
    marginPerMt: 0,
    tradeCurrency: "USD",
    inspectionBasis: "THIRD_PARTY",
  }).where(eq(s.orders.id, t2.id));

  /* ---------- protected-entity set for trade 1 (a CHAIN, not a name) ---------- */
  const entities: (s.ProtectedEntity & object)[] = [];
  const set: ProtectedEntityInput[] = [
    {
      entityName: "Qingdao Haoyuan Chemical Co.",
      aliases: ["Qingdao Haoyuan", "青岛昊源化工"],
      phones: ["+86 532 8800 1234"],
      addresses: ["14 Haoyuan Industrial Park, Qingdao, China"],
      bankAccounts: ["HSBC HK 808-442211-001"],
      contacts: ["Manager Li", "Li Wei"],
    },
    {
      entityName: "Shandong Huayi International Trade",
      aliases: ["山东华益国际贸易", "Huayi Trading"],
      phones: ["+86 531 7700 9988"],
      addresses: ["Jinan Free Trade Zone, Shandong, China"],
      bankAccounts: [],
      contacts: ["Chen Xiaoming"],
    },
    {
      entityName: "Fuzhou Lianhe Trading Co Ltd",
      aliases: ["Fuzhou Lianhe", "福州联合贸易"],
      phones: [],
      addresses: ["88 Export Ave, Fuzhou, China"],
      bankAccounts: [],
      contacts: [],
    },
  ];
  const roles = ["CONTRACTING_SELLER", "MAINLAND_ENTITY", "EXPORT_OF_RECORD"] as const;
  for (let i = 0; i < set.length; i++) {
    const [{ id }] = await db.insert(s.protectedEntities).values({
      orderId: t1.id, entityName: set[i].entityName, role: roles[i],
      aliases: set[i].aliases, phones: set[i].phones, addresses: set[i].addresses,
      bankAccounts: set[i].bankAccounts, contacts: set[i].contacts,
    }).returning({ id: s.protectedEntities.id });
    entities.push({ id } as never);
  }
  // Same set protects trade 2 (same supplier chain)
  for (const e of set) {
    await db.insert(s.protectedEntities).values({
      orderId: t2.id, entityName: e.entityName, role: "CONTRACTING_SELLER",
      aliases: e.aliases, phones: e.phones, addresses: e.addresses,
      bankAccounts: e.bankAccounts, contacts: e.contacts,
    });
  }
  console.log("Protected-entity sets created for 2 trades.");

  /* ---------- gated documents for trade 1 ---------- */
  const entityInputs = set;
  // 1. LEAKED fumigation certificate (Class C), Chinese body, contact + phone
  const fumigation = [
    "熏蒸证书 / FUMIGATION CERTIFICATE",
    "Issued by: 山东华益国际贸易 (Shandong Huayi International Trade)",
    "Contact: Manager Li · Tel: +86 532 8800 1234",
    "Treatment: wooden pallets heat-treated per ISPM-15",
    "Cargo: 48 MT Ferrous Sulphate Heptahydrate in 25kg bags",
    "Destination: Santa Cruz de Tenerife",
  ].join("\n");
  const fumFindings = scanText(fumigation, entityInputs);
  await db.insert(s.documents).values({
    orderId: t1.id, type: "CUSTOMS", name: "Fumigation certificate (supplier original)",
    rawText: fumigation, docClass: "C", gateState: "RESOLVE_THEN_PASS",
    scanFindings: fumFindings, fixAction: "REISSUE_COO",
  });

  // 2. Draft B/L (Class B), internal annotation block
  const draftBl = [
    "DRAFT BILL OF LADING, MSC line",
    "Shipper: Qingdao Haoyuan Chemical Co., 14 Haoyuan Industrial Park, Qingdao",
    "Consignee: To order",
    "Cargo: 2x20' containers, 48 MT fertilizer, 1,920 x 25kg bags",
    "---- INTERNAL WORKING NOTES ----",
    "Real Shipper: Qingdao Haoyuan Chemical Co. ops@haoyuan-demo.cn",
    "Real Consignee: Aquifert Limited, London",
    "Real Notify: buyer agent +44 7700 900123",
  ].join("\n");
  const blFindings = scanText(draftBl, entityInputs);
  await db.insert(s.documents).values({
    orderId: t1.id, type: "BOL", name: "Draft Bill of Lading (carrier)",
    rawText: draftBl, docClass: "B", gateState: "RESOLVE_THEN_PASS",
    scanFindings: blFindings, fixAction: "SWITCH_BL",
  });

  // 3. Commercial invoice (Class A), regenerated clean, cleared (the done-right example)
  const cleanInvoice = [
    "════════════════════════════════════════════════════════════",
    "  AQUIFERT LIMITED · London, United Kingdom",
    "  COMMERCIAL INVOICE",
    "════════════════════════════════════════════════════════════",
    "  Trade reference : AQ-TE-08-06-000617",
    "  Seller          : Aquifert Limited, London",
    "  Product         : Ferrous Sulphate Heptahydrate, Fe 19% min",
    "  Quantity        : 50 MT ±10% at seller's option",
    "  Unit price      : USD 515.00 / MT",
    "  Destination     : Santa Cruz de Tenerife",
  ].join("\n");
  const admin = await db.query.users.findFirst({ where: eq(s.users.portalRole, "ADMIN") });
  await db.insert(s.documents).values({
    orderId: t1.id, type: "INVOICE", name: "Commercial invoice (Aquifert)",
    rawText: null, cleanText: cleanInvoice, docClass: "A", gateState: "PASS",
    scanFindings: [], fixAction: "REGENERATE",
    buyerReleasable: true, clearedBy: admin?.id ?? null, clearedAt: new Date(),
  });

  // 4. Proforma (Class A), numeric mismatch vs invoice for the consistency demo
  const proforma = [
    "PROFORMA INVOICE, AQUIFERT LIMITED",
    "Trade: AQ-TE-08-06-000617 · Contract AQ-TE-08-06-000617",
    "Product: Ferrous Sulphate Heptahydrate, Fe 19% min",
    "Quantity billed: 50 MT",
    "Unit price: USD 515/MT CFR Santa Cruz de Tenerife",
  ].join("\n");
  const supplierInvoice = [
    "COMMERCIAL INVOICE (buy-side)",
    "Contract WGR-DEMO-0612",
    "Product: Ferrous Sulphate Heptahydrate, Fe 19.7% min",
    "Quantity shipped: 48 MT",
    "Unit price: USD 300/MT FOB Tianjin",
    "Seller: Qingdao Haoyuan Chemical Co. · Bank: HSBC HK 808-442211-001",
  ].join("\n");
  await db.insert(s.documents).values({
    orderId: t1.id, type: "INVOICE", name: "Proforma invoice (Aquifert, draft)",
    rawText: proforma, docClass: "A", gateState: "BLOCKED", scanFindings: [], fixAction: null,
  });
  const supInvFindings = scanText(supplierInvoice, entityInputs);
  await db.insert(s.documents).values({
    orderId: t1.id, type: "INVOICE", name: "Supplier commercial invoice (raw)",
    rawText: supplierInvoice, docClass: "A", gateState: "RESOLVE_THEN_PASS",
    scanFindings: supInvFindings, fixAction: "REGENERATE",
  });
  console.log("Demo documents seeded (2 leaks, 1 cleared clean, 1 blocked proforma).");

  /* ---------- pending per-buyer margin review (trade 1) ---------- */
  const buyerUser = await db.query.users.findFirst({ where: eq(s.users.id, (await db.query.quotes.findFirst({ where: eq(s.quotes.id, t1.quoteId) }))!.requestId ? 0 : 0) });
  void buyerUser;
  const quote1 = await db.query.quotes.findFirst({ where: eq(s.quotes.id, t1.quoteId) });
  const req1 = quote1 ? await db.query.requests.findFirst({ where: eq(s.requests.id, quote1.requestId) }) : null;
  const buyer1 = req1 ? await db.query.users.findFirst({ where: eq(s.users.id, req1.buyerId) }) : null;
  const buyerOrg1 = buyer1?.organizationId ? await db.query.organizations.findFirst({ where: eq(s.organizations.id, buyer1.organizationId) }) : null;
  const pct = Number(buyerOrg1?.marginProfilePct ?? 8) || 8;
  const buy = 300, freight = 150;
  const marginPerMt = Math.round((buy + freight) * (pct / 100) * 100) / 100;
  const sellPerMt = Math.round((buy + freight + marginPerMt) * 100) / 100;
  await db.insert(s.agentDrafts).values({
    kind: "MARGIN_REVIEW",
    orderId: t1.id,
    requestId: req1?.id ?? null,
    title: `Margin review, ${buyerOrg1?.name ?? "Buyer"} · AQ-TE-08-06-000617`,
    draftText: [
      `FIRM PRICE, Ferrous Sulphate Heptahydrate → Santa Cruz de Tenerife`,
      ``,
      `Dear ${buyerOrg1?.name ?? "Buyer"},`,
      ``,
      `We are pleased to offer 50 MT ±10% at USD ${sellPerMt.toFixed(2)} / MT CFR Santa Cruz de Tenerife.`,
      `Packing: 25kg buyer's-design bags on pallets. Inspection: seller's certificate, buyer's option of independent inspector.`,
      `This offer is valid for 48 hours from issue.`,
    ].join("\n"),
    payload: {
      stage: 8,
      dealType: "TRADITIONAL",
      buyerOrgId: buyerOrg1?.id ?? null,
      buyerMarginProfilePct: pct,
      appliedPct: pct,
      inputs: { buyPricePerMt: buy, freightPerMt: freight, quantityMt: 50, marginPerMt, sellPricePerMt: sellPerMt, currency: "USD" },
      rationale: {
        fobRead: "Buy side at USD 300.00/MT FOB Tianjin",
        freightRead: "Freight + clearing USD 150.00/MT on 2×20' containers, the freight read is what reveals the real room",
        buyerTrackRecord: `${buyerOrg1?.name ?? "Buyer"} margin profile: ${pct}%`,
        marketRead: "Ferrous sulphate demand firm into Q3; freight stable",
        judgment: "Margin is a human judgment, engine assembles inputs, a human decides.",
      },
    },
    status: "PENDING",
  });
  console.log(`Pending margin review seeded at ${pct}% → USD ${marginPerMt}/MT (sell ${sellPerMt}).`);

  /* ---------- freight forwarder bids (masked aliases) ---------- */
  const bids = [
    { alias: "Forwarder A", price: 1450, days: 32 },
    { alias: "Forwarder B", price: 1395, days: 35 },
    { alias: "Forwarder C", price: 1520, days: 29 },
  ];
  for (const b of bids) {
    await db.insert(s.freightBids).values({
      orderId: t1.id, forwarderAlias: b.alias, pricePerContainer: b.price, transitDays: b.days, status: "OPEN",
    });
  }
  console.log("Masked freight bids seeded. Spine seed complete.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
