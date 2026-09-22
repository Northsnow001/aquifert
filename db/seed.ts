/**
 * AQUIFERT demo seed, run with: npx tsx db/seed.ts
 * Idempotent: skips if demo data already present.
 */
import "dotenv/config";
import { getDb } from "../api/queries/connection";
import * as s from "./schema";
import { eq } from "drizzle-orm";

/* deterministic RNG */
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const daysAgo = (n: number, h = 0) => new Date(Date.now() - n * 864e5 - h * 36e5);
const daysAhead = (n: number) => new Date(Date.now() + n * 864e5);

const MILESTONE_ORDER = [
  "BOOKED", "GATE_IN", "LOADED", "DEPARTURE", "IN_TRANSIT",
  "ARRIVAL", "CUSTOMS", "CLEARED", "OUT_FOR_DELIVERY", "DELIVERED",
] as const;

const ROUTE: { name: string; lat: number; lng: number }[] = [
  { name: "Shanghai, CN", lat: 31.23, lng: 121.47 },
  { name: "Singapore Strait", lat: 1.26, lng: 103.82 },
  { name: "Colombo, LK", lat: 6.93, lng: 79.85 },
  { name: "Suez Canal, EG", lat: 30.42, lng: 32.34 },
  { name: "Gibraltar Strait", lat: 35.95, lng: -5.65 },
  { name: "English Channel", lat: 49.9, lng: -2.5 },
  { name: "Felixstowe, UK", lat: 51.95, lng: 1.31 },
];

function buildShipment(idx: number, delay: boolean) {
  const statusIdx = idx;
  const status = MILESTONE_ORDER[statusIdx];
  // map status to a route position (0..1)
  const posMap: Record<string, number> = {
    BOOKED: 0, GATE_IN: 0.02, LOADED: 0.05, DEPARTURE: 0.1,
    IN_TRANSIT: 0.35 + rand() * 0.3, ARRIVAL: 0.92, CUSTOMS: 0.95,
    CLEARED: 0.97, OUT_FOR_DELIVERY: 0.99, DELIVERED: 1,
  };
  const p = posMap[status];
  const segFloat = p * (ROUTE.length - 1);
  const seg = Math.min(Math.floor(segFloat), ROUTE.length - 2);
  const frac = segFloat - seg;
  const lat = ROUTE[seg].lat + (ROUTE[seg + 1].lat - ROUTE[seg].lat) * frac;
  const lng = ROUTE[seg].lng + (ROUTE[seg + 1].lng - ROUTE[seg].lng) * frac;
  const locName = p >= 1 ? ROUTE[ROUTE.length - 1].name
    : p <= 0.05 ? ROUTE[0].name
    : `Near ${ROUTE[seg + 1].name}`;
  const delayDays = delay ? 1 + Math.floor(rand() * 4) : 0;
  const eta = daysAhead(Math.max(0, Math.round((1 - p) * 30)) + delayDays);
  const milestones = MILESTONE_ORDER.map((m, i) => ({
    key: m,
    label: m.replace(/_/g, " "),
    done: i <= statusIdx,
    current: i === statusIdx,
    timestamp: i < statusIdx ? daysAgo((statusIdx - i) * 2).toISOString()
      : i === statusIdx ? daysAgo(0, 6).toISOString() : null,
    location: i <= 3 ? ROUTE[0].name : i >= 5 ? ROUTE[ROUTE.length - 1].name : locName,
  }));
  return { status, lat, lng, locName, eta, delayDays, milestones };
}

async function main() {
  const db = getDb();
  const existing = await db.select().from(s.requests).limit(1);
  if (existing.length > 0) {
    console.log("Seed skipped, demo data already present.");
    return;
  }
  console.log("Seeding AQUIFERT demo data…");

  /* ---------- organizations ---------- */
  const buyerOrgNames = [
    "Yorkshire Growers Co-operative", "East Anglia Agronomy Ltd",
    "Caledonian Farms Group", "Severn Valley Agri Supplies",
    "Kent Downs Crop Nutrition", "Ulster Arable Partners",
    "Norfolk Broads Farming", "Pembroke Pastoral Ltd",
    "Highland Grain Alliance", "Wessex Fertiliser Buyers",
  ];
  const supplierOrgNames = [
    "Qingdao Haoyuan Chemical Co.", "SinoFert Holdings Ltd",
    "Gansu Nitrogen Works", "UralChem Trading GmbH", "Gulf Phosphate Exports",
  ];
  const buyerOrgIds: number[] = [];
  for (const name of buyerOrgNames) {
    const [{ id }] = await db.insert(s.organizations).values({
      name, type: "BUYER", country: "United Kingdom",
      address: `${Math.floor(rand() * 200) + 1} Farm Business Park, UK`,
      vatNumber: `GB${Math.floor(rand() * 9e8) + 1e8}`, verified: rand() > 0.3,
    }).returning({ id: s.organizations.id });
    buyerOrgIds.push(id);
  }
  const supplierOrgIds: number[] = [];
  for (const name of supplierOrgNames) {
    const [{ id }] = await db.insert(s.organizations).values({
      name, type: "SUPPLIER",
      country: pick(["China", "China", "Germany", "Russia", "Saudi Arabia"]),
      address: "Industrial Export Zone", verified: true,
      contactPerson: pick(["Li Wei", "Chen Xiaoming", "Wang Fang", "Dmitri Volkov", "Faisal Al-Rashid"]),
      wechatId: `wx_${Math.floor(rand() * 1e6)}`,
      bankDetails: "HSBC Hong Kong · USD Account",
    }).returning({ id: s.organizations.id });
    supplierOrgIds.push(id);
  }

  /* ---------- users ---------- */
  async function addUser(u: Partial<s.InsertUser> & { unionId: string }) {
    const [{ id }] = await db.insert(s.users).values({
      name: u.name ?? u.unionId, role: u.role ?? "user", ...u,
    } as s.InsertUser).returning({ id: s.users.id });
    return id;
  }
  const adminId = await addUser({ unionId: "demo_admin", name: "Amelia Hart", email: "admin@aquifert.com", role: "admin", portalRole: "ADMIN" });
  const opsId = await addUser({ unionId: "demo_ops", name: "Oliver Grant", email: "ops@aquifert.com", role: "admin", portalRole: "OPERATIONS" });
  const finId = await addUser({ unionId: "demo_finance", name: "Priya Shah", email: "finance@aquifert.com", role: "admin", portalRole: "FINANCE" });
  await addUser({ unionId: "demo_support", name: "Tom Beckett", email: "support@aquifert.com", role: "admin", portalRole: "SUPPORT" });

  const buyerIds: number[] = [];
  const buyerNames = ["James Whitfield", "Sarah O'Connell", "Hamish McLeod", "Emma Radcliffe",
    "Daniel Ashford", "Fiona Gallagher", "George Pattison", "Megan Hughes",
    "Robert Sinclair", "Lucy Chamberlain"];
  for (let i = 0; i < buyerNames.length; i++) {
    const id = await addUser({
      unionId: `demo_buyer_${i + 1}`, name: buyerNames[i],
      email: `buyer${i + 1}@example.co.uk`, portalRole: "BUYER",
      organizationId: buyerOrgIds[i], phone: `+44 7${Math.floor(rand() * 9e8) + 1e8}`,
    });
    buyerIds.push(id);
  }
  const supplierIds: number[] = [];
  const supplierNames = ["Li Wei", "Chen Xiaoming", "Wang Fang", "Dmitri Volkov", "Faisal Al-Rashid"];
  for (let i = 0; i < supplierNames.length; i++) {
    const id = await addUser({
      unionId: `demo_supplier_${i + 1}`, name: supplierNames[i],
      email: `supplier${i + 1}@example.com`, portalRole: "SUPPLIER",
      organizationId: supplierOrgIds[i],
    });
    supplierIds.push(id);
  }

  /* ---------- memberships (3 members across tiers) ---------- */
  const tiers = [
    { tier: "SPROUT", price: 2000, limit: 50 },
    { tier: "HARVEST", price: 5000, limit: 200 },
    { tier: "SCALE", price: 7000, limit: 1000 },
  ] as const;
  for (let i = 0; i < 3; i++) {
    const t = tiers[i];
    await db.insert(s.memberships).values({
      userId: buyerIds[i], tier: t.tier, status: "ACTIVE",
      monthlyTonnageLimit: t.limit, currentMonthTonnage: Math.floor(rand() * t.limit * 0.6),
      price: t.price, billingCycle: i === 2 ? "ANNUAL" : "MONTHLY",
      startDate: daysAgo(30 + i * 12), endDate: daysAhead(300),
    });
  }

  /* ---------- requests ---------- */
  const products = ["UREA", "DAP", "MOP", "MAP", "NPK"] as const;
  const destinations = ["Felixstowe, UK", "Liverpool, UK", "Southampton, UK", "Immingham, UK", "Belfast, UK", "Teesport, UK"];
  const statuses = ["NEW", "NEW", "QUOTED", "QUOTED", "ACCEPTED", "PAID", "SHIPPED", "IN_TRANSIT", "IN_TRANSIT", "DELIVERED", "COMPLETED", "COMPLETED", "QUOTED", "NEW", "ACCEPTED"] as const;
  const requestIds: number[] = [];
  for (let i = 0; i < 15; i++) {
    const buyer = buyerIds[i % buyerIds.length];
    const [{ id }] = await db.insert(s.requests).values({
      requestNumber: `REQ-${String(2401 + i)}`,
      buyerId: buyer,
      product: products[i % products.length],
      quantity: pick([25, 40, 50, 75, 100, 120, 150, 200, 250, 300]),
      destination: pick(destinations),
      deliveryDate: daysAhead(14 + i * 3),
      incoterms: pick(["DDP", "FOB", "CIF"] as const),
      specialInstructions: i % 3 === 0 ? "Granular grade preferred. Palletised delivery required." : null,
      status: statuses[i],
      originChannel: pick(["WHATSAPP", "PORTAL", "EMAIL"] as const),
      createdAt: daysAgo(20 - i),
    }).returning({ id: s.memberships.id });
    requestIds.push(id);
  }

  /* ---------- quotes ---------- */
  const quoteStatuses = ["PENDING_APPROVAL", "PENDING_APPROVAL", "DRAFT", "SENT", "SENT", "ACCEPTED", "ACCEPTED", "REJECTED"] as const;
  const quoteIds: number[] = [];
  for (let i = 0; i < 8; i++) {
    const reqIdx = i + 2; // attach to requests 3..10
    const qty = 100;
    const productCost = 28000 + Math.floor(rand() * 22000);
    const shippingCost = 5500 + Math.floor(rand() * 4000);
    const clearingCost = 1200 + Math.floor(rand() * 1300);
    const marginPct = pick([6, 7.5, 8, 9, 10]);
    const sub = productCost + shippingCost + clearingCost;
    const margin = Math.round((sub * marginPct) / 100);
    const [{ id }] = await db.insert(s.quotes).values({
      requestId: requestIds[reqIdx],
      supplierId: supplierIds[i % supplierIds.length],
      adminId,
      productCost, shippingCost, clearingCost, margin,
      total: sub + margin, marginPercentage: marginPct,
      status: quoteStatuses[i],
      aiMessage: "AI-drafted buyer message ready for review.",
      validUntil: daysAhead(7 + i),
      createdAt: daysAgo(10 - i),
    }).returning({ id: s.quotes.id });
    quoteIds.push(id);
    void qty;
  }

  /* ---------- orders + shipments + invoices + documents ---------- */
  const acceptedQuotes = quoteIds.slice(5, 7); // two ACCEPTED quotes
  const shipIdx = [4, 8, 3, 9, 1]; // IN_TRANSIT-ish variety
  const orderIds: number[] = [];
  for (let i = 0; i < 5; i++) {
    const quoteId = i < 2 ? acceptedQuotes[i] : quoteIds[i % quoteIds.length];
    const q = await db.query.quotes.findFirst({ where: eq(s.quotes.id, quoteId) });
    const total = q?.total ?? 45000;
    const paid = i < 3;
    const [{ id: orderId }] = await db.insert(s.orders).values({
      quoteId, orderNumber: `ORD-${5100 + i}`,
      paymentStatus: paid ? "PAID" : "PENDING",
      shipmentStatus: MILESTONE_ORDER[shipIdx[i]],
      total, paidAt: paid ? daysAgo(8 - i) : null,
      createdAt: daysAgo(12 - i),
    }).returning({ id: s.orders.id });
    orderIds.push(orderId);

    const sh = buildShipment(shipIdx[i], i === 0);
    await db.insert(s.shipments).values({
      orderId,
      containerNumber: `MSKU${Math.floor(rand() * 9e6) + 1e6}`,
      vesselName: pick(["MV Pacific Grain", "MV Oriental Jade", "MV Baltic Star", "MV Coral Chief", "MV Meridian"]),
      bolNumber: `BOL-${Math.floor(rand() * 9e5) + 1e5}`,
      carrier: pick(["Maersk", "COSCO", "MSC", "CMA CGM"]),
      departurePort: "Shanghai, CN",
      destinationPort: pick(destinations),
      milestones: sh.milestones, route: ROUTE,
      currentLocation: sh.locName, currentLat: sh.lat, currentLng: sh.lng,
      eta: sh.eta, delayed: sh.delayDays > 0, delayDays: sh.delayDays,
      status: sh.status as (typeof MILESTONE_ORDER)[number],
    });

    await db.insert(s.invoices).values({
      orderId, invoiceNumber: `INV-${8800 + i}`,
      type: "PROFORMA", amount: total, currency: "GBP",
      dueDate: daysAhead(10), paidAt: paid ? daysAgo(8 - i) : null,
      createdAt: daysAgo(11 - i),
    });
    for (const docType of ["INVOICE", "PACKING_LIST", "BOL"] as const) {
      await db.insert(s.documents).values({
        orderId, type: docType,
        name: `${docType.replace(/_/g, " ")}, ORD-${5100 + i}.pdf`,
        url: "#", uploadedBy: adminId, createdAt: daysAgo(10 - i),
      });
    }
  }

  /* ---------- conversations (unified inbox) ---------- */
  const convSeeds = [
    { name: "James Whitfield", src: "WHATSAPP", product: "Urea", qty: 100, dest: "Felixstowe, UK", conf: 92 },
    { name: "Sarah O'Connell", src: "WHATSAPP", product: "DAP", qty: 50, dest: "Belfast, UK", conf: 78 },
    { name: "Hamish McLeod", src: "EMAIL", product: "MOP", qty: 200, dest: "Teesport, UK", conf: 88 },
    { name: "Emma Radcliffe", src: "PORTAL", product: "NPK", qty: 75, dest: "Southampton, UK", conf: 95 },
    { name: "Daniel Ashford", src: "WECHAT", product: "MAP", qty: 150, dest: "Liverpool, UK", conf: 64 },
  ] as const;
  for (let i = 0; i < convSeeds.length; i++) {
    const c = convSeeds[i];
    await db.insert(s.conversations).values({
      buyerName: c.name, source: c.src,
      participants: [c.name, "AQUIFERT AI"],
      messages: [
        { from: "buyer", text: `Hi, I need a quote for ${c.qty} tons of ${c.product} to ${c.dest}. Can you help?`, at: daysAgo(1, i * 3).toISOString() },
        { from: "ai", text: "Thanks! I'm checking live supplier availability and freight rates for you now, a member of our team will confirm shortly.", at: daysAgo(1, i * 3 - 1).toISOString() },
        { from: "buyer", text: "Great, also need delivery within 4 weeks if possible.", at: daysAgo(0, 20 - i).toISOString() },
      ],
      summary: `${c.qty}t ${c.product} → ${c.dest}. Buyer requested pricing and delivery window.`,
      extracted: {
        product: c.product.toUpperCase(), quantity: c.qty, destination: c.dest,
        deliveryDate: daysAhead(28).toISOString().slice(0, 10),
        specialInstructions: i === 4 ? "Unclear on grade, clarification recommended" : "Standard granular grade",
      },
      aiConfidence: c.conf,
      status: i < 3 ? "PENDING" : "PROCESSED",
      createdAt: daysAgo(1, i * 2),
    });
  }

  /* ---------- market data: 26 weeks × 5 commodities × 4 regions ---------- */
  const regions = ["UK", "EU", "Asia", "Americas"];
  const basePrice: Record<string, number> = { UREA: 320, DAP: 540, MOP: 300, MAP: 560, NPK: 480 };
  for (const comm of products) {
    for (const region of regions) {
      let price = basePrice[comm] * (1 + (rand() - 0.5) * 0.1);
      for (let w = 25; w >= 0; w--) {
        price = Math.max(120, price * (1 + (rand() - 0.48) * 0.035));
        await db.insert(s.marketData).values({
          commodity: comm, region,
          pricePerTon: Math.round(price * 100) / 100,
          currency: "USD", date: daysAgo(w * 7),
          source: pick(["Argus FMB", "CRU Fertilizer Week", "ICIS", "AQUIFERT Index"]),
        });
      }
    }
  }

  /* ---------- financing applications ---------- */
  await db.insert(s.financingApplications).values({
    buyerId: buyerIds[1], orderId: orderIds[0], amount: 38000,
    creditLimit: 50000, interestRate: 4.9, term: 60, status: "ACTIVE",
    repaymentSchedule: [
      { due: daysAhead(30).toISOString().slice(0, 10), amount: 19310, paid: false },
      { due: daysAhead(60).toISOString().slice(0, 10), amount: 19310, paid: false },
    ],
    signedAt: daysAgo(6),
  });
  await db.insert(s.financingApplications).values({
    buyerId: buyerIds[2], orderId: orderIds[1], amount: 42000, term: 90, status: "PENDING",
  });
  await db.insert(s.financingApplications).values({
    buyerId: buyerIds[0], orderId: orderIds[2], amount: 21000,
    creditLimit: 30000, interestRate: 5.4, term: 30, status: "REPAID",
    signedAt: daysAgo(45),
  });

  /* ---------- notifications ---------- */
  const notifTypes = [
    ["QUOTE_READY", "Quote ready for review", "Your quote for 100t Urea is ready, expires in 6 days.", "/buyer/quotes"],
    ["ORDER_SHIPPED", "Order shipped", "Container MSKU4821103 has departed Shanghai.", "/buyer/orders"],
    ["PAYMENT_DUE", "Payment due soon", "Proforma invoice INV-8803 is due in 3 days.", "/buyer/quotes"],
    ["PRICE_ALERT", "Urea price movement", "Urea (UK) is up 3.2% week-on-week.", "/buyer/insights"],
    ["MEMBERSHIP", "Membership renewal", "Your Harvest plan renews on the 1st of next month.", "/buyer/membership"],
    ["DELIVERY", "Delivery update", "ORD-5102 is now out for delivery.", "/buyer/orders"],
  ] as const;
  for (let i = 0; i < 30; i++) {
    const n = notifTypes[i % notifTypes.length];
    const target = i % 2 === 0 ? buyerIds[i % 3] : adminId;
    await db.insert(s.notifications).values({
      userId: target, type: n[0], title: n[1], message: n[2],
      read: i > 8, actionUrl: n[3], createdAt: daysAgo(0, i),
    });
  }

  /* ---------- activities ---------- */
  const acts = [
    ["AQUIFERT AI", "Summarised WhatsApp inquiry from James Whitfield", "conversation", "1"],
    ["Amelia Hart", "Approved quote for REQ-2405 and sent to buyer", "quote", "5"],
    ["System", "Payment received for ORD-5100 (£48,250)", "order", "1"],
    ["AQUIFERT AI", "Drafted quote for REQ-2403, pending approval", "quote", "1"],
    ["Oliver Grant", "Added shipment MSKU4821103 to tracking", "shipment", "1"],
    ["Priya Shah", "Approved financing application (£38,000 @ 4.9%)", "financing", "1"],
    ["System", "Delivery exception: ORD-5100 ETA revised +3 days", "shipment", "1"],
    ["AQUIFERT AI", "Generated weekly Urea market insight", "insight", "1"],
  ];
  for (let i = 0; i < acts.length; i++) {
    await db.insert(s.activities).values({
      userId: adminId, actor: acts[i][0], action: acts[i][1],
      entity: acts[i][2], entityId: acts[i][3], createdAt: daysAgo(0, i * 2),
    });
  }

  /* ---------- broadcasts ---------- */
  await db.insert(s.broadcasts).values({
    audience: "ALL", channel: "WHATSAPP",
    message: "Urea (UK) rose 3.2% w/w to $331/t amid tighter Middle East supply. Recommend locking Q3 coverage.",
    scheduledAt: daysAgo(3), status: "SENT", createdAt: daysAgo(4),
  });
  await db.insert(s.broadcasts).values({
    audience: "TIER_2_PLUS", channel: "EMAIL",
    message: "DAP softening in Asia, buying window likely over the next 2–3 weeks.",
    scheduledAt: daysAhead(2), status: "SCHEDULED", createdAt: daysAgo(1),
  });

  /* ---------- supplier requests + catalog ---------- */
  for (let i = 0; i < 6; i++) {
    await db.insert(s.supplierRequests).values({
      requestId: requestIds[i + 2], supplierId: supplierIds[i % supplierIds.length],
      status: i < 2 ? "NEW" : i < 4 ? "QUOTED" : "ACCEPTED",
      supplierMessage: `Request for ${products[(i + 2) % 5]}, please confirm price per ton and earliest ship date.`,
    });
  }
  for (let i = 0; i < supplierIds.length; i++) {
    for (const p of [products[i % 5], products[(i + 2) % 5]]) {
      await db.insert(s.supplierProducts).values({
        supplierId: supplierIds[i], product: p,
        specSheet: `${p}, 46% N prilled, bulk or 50kg bags, SGS inspected.`,
      });
    }
  }

  console.log("Seed complete ✔");
  console.log("Demo users: admin@aquifert.com, buyers 1-10, suppliers 1-5 (sign in via Kimi, then pick a demo role).");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
