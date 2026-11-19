import type {
  AqAnalyticsState,
  CountryProfile,
  FreightImport,
  FreightOrder,
  PortLineup,
  ProducerStatus,
} from "@/lib/aq-analytics/types";

const LOAD: { port: string; country: string; lat: number; lon: number }[] = [
  { port: "Damietta", country: "Egypt", lat: 31.42, lon: 31.81 },
  { port: "Abu Qir", country: "Egypt", lat: 31.32, lon: 30.07 },
  { port: "Ain Sokhna", country: "Egypt", lat: 29.65, lon: 32.36 },
  { port: "Jorf Lasfar", country: "Morocco", lat: 33.12, lon: -8.64 },
  { port: "Safi", country: "Morocco", lat: 32.3, lon: -9.23 },
  { port: "Yuzhny", country: "Ukraine", lat: 46.6, lon: 31.01 },
  { port: "Novorossiysk", country: "Russia", lat: 44.72, lon: 37.77 },
  { port: "Qingdao", country: "China", lat: 36.07, lon: 120.38 },
  { port: "Lianyungang", country: "China", lat: 34.75, lon: 119.45 },
  { port: "Mesaieed", country: "Qatar", lat: 24.99, lon: 51.55 },
  { port: "Ras Al Khair", country: "Saudi Arabia", lat: 27.48, lon: 49.21 },
];

const DISCH: { port: string; country: string; lat: number; lon: number }[] = [
  { port: "Iskenderun", country: "Turkey", lat: 36.58, lon: 36.17 },
  { port: "Mersin", country: "Turkey", lat: 36.8, lon: 34.63 },
  { port: "Samsun", country: "Turkey", lat: 41.28, lon: 36.33 },
  { port: "Izmir", country: "Turkey", lat: 38.43, lon: 27.15 },
  { port: "Santos", country: "Brazil", lat: -23.96, lon: -46.33 },
  { port: "Paranagua", country: "Brazil", lat: -25.52, lon: -48.52 },
  { port: "Mundra", country: "India", lat: 22.84, lon: 69.72 },
  { port: "Kandla", country: "India", lat: 23.03, lon: 70.22 },
  { port: "Lagos", country: "Nigeria", lat: 6.45, lon: 3.4 },
  { port: "Ravenna", country: "Italy", lat: 44.42, lon: 12.23 },
  { port: "Piraeus", country: "Greece", lat: 37.94, lon: 23.64 },
];

const PRODUCTS = ["Urea", "DAP", "TSP", "MAP", "MOP", "NPK", "Ammonium Sulphate"];
const QTY = [18000, 25000, 33000, 45000, 52000, 63000, 72000];
const DATA_NOW = "2026-09-03";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function iso(y: number, m: number, d: number) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function buildOrders(): { imports: FreightImport[]; orders: FreightOrder[] } {
  const rand = rng(0x220fc5f);
  const imports: FreightImport[] = [];
  const orders: FreightOrder[] = [];
  let id = 1;
  const years = [2021, 2022, 2023, 2024, 2025, 2026];
  for (const year of years) {
    const lastMonth = year === 2026 ? 9 : 12;
    const lastDay = year === 2026 ? 3 : 28;
    const reportDate = iso(year, lastMonth, Math.min(lastDay, 28));
    const importId = `imp-${year}`;
    const startId = id;
    for (let i = 0; i < (year === 2026 ? 90 : 70); i += 1) {
      const month = year === 2026 ? 1 + Math.floor(rand() * 8) : 1 + Math.floor(rand() * 12);
      const day = 1 + Math.floor(rand() * 24);
      const start = iso(year, month, day);
      if (start > DATA_NOW) continue;
      const load = LOAD[Math.floor(rand() * LOAD.length)];
      const disch = DISCH[Math.floor(rand() * DISCH.length)];
      const qty = QTY[Math.floor(rand() * QTY.length)];
      const product = PRODUCTS[Math.floor(rand() * PRODUCTS.length)];
      const accountN = 1 + Math.floor(rand() * 18);
      orders.push({
        id: id++,
        importId,
        segment: rand() > 0.35 ? "week" : "quoted",
        account: `Account ${pad(accountN)}`,
        orderType: rand() > 0.25 ? "cargo" : "tonnage",
        product,
        packing: rand() > 0.4 ? "bulk" : "bagged",
        qtyMin: Math.round(qty * 0.92),
        qtyMax: qty,
        loadPort: load.port,
        loadCountry: load.country,
        loadLat: load.lat,
        loadLon: load.lon,
        dischPort: disch.port,
        dischCountry: disch.country,
        dischLat: disch.lat,
        dischLon: disch.lon,
        laycanStart: start,
        laycanEnd: addDays(start, 8 + Math.floor(rand() * 12)),
        needsReview: false,
      });
    }
    imports.push({
      id: importId,
      source: `Broker email · ${year}`,
      reportDate: year === 2026 ? DATA_NOW : reportDate,
      totalOrders: id - startId,
    });
  }
  return { imports, orders };
}

const LINEUPS: PortLineup[] = [
  { port: "Iskenderun", country: "Turkey", berth: 1, anchor: 2, expected: 2, note: "2 bulkers inbound from Damietta and Mesaieed" },
  { port: "Mersin", country: "Turkey", berth: 1, anchor: 0, expected: 1, note: "1 Handymax expected from Yuzhny, ETA 19 Nov" },
  { port: "Samsun", country: "Turkey", berth: 0, anchor: 1, expected: 1, note: "Black Sea arrivals slower than usual this month" },
  { port: "Damietta", country: "Egypt", berth: 2, anchor: 1, expected: 2, note: "Declared destinations: Turkey, Italy, Brazil" },
  { port: "Abu Qir", country: "Egypt", berth: 1, anchor: 0, expected: 1, note: "Declared destinations: Greece, Turkey" },
  { port: "Ain Sokhna", country: "Egypt", berth: 0, anchor: 1, expected: 1, note: "Declared destinations: India, Kenya" },
  { port: "Jorf Lasfar", country: "Morocco", berth: 2, anchor: 1, expected: 1, note: "Steady DAP/MAP programme into the Med" },
];

const PRODUCERS: ProducerStatus[] = [
  { country: "Egypt", label: "Producer A · Damietta", note: "Two Dec lots indicated to Med buyers", status: "Offering Dec", updatedAt: "2026-08-28" },
  { country: "Egypt", label: "Producer B · Abu Qir", note: "Granular available; prilled committed", status: "Offering Dec", updatedAt: "2026-08-28" },
  { country: "Egypt", label: "Producer C · Ain Sokhna", note: "Gas curtailment risk flagged", status: "Limited", updatedAt: "2026-08-28" },
  { country: "Egypt", label: "Producer D · Damietta", note: "Contract volumes to Europe", status: "Sold Dec", updatedAt: "2026-08-28" },
  { country: "Morocco", label: "Producer E · Jorf Lasfar", note: "DAP/MAP programme committed to contract buyers", status: "Limited", updatedAt: "2026-08-20" },
  { country: "Morocco", label: "Producer F · Safi", note: "Spot TSP lots for the Med", status: "Offering Dec", updatedAt: "2026-08-20" },
];

const PROFILES: CountryProfile[] = [
  { country: "Turkey", role: "import", monthlyCapacityMt: null, primaryWindow: [0, 1, 2, 3], secondaryWindow: [9, 10, 11], calendarNote: "Demand is driven by wheat: top-dressing peaks Feb–Mar, with autumn sowing Oct–Nov." },
  { country: "Egypt", role: "export", monthlyCapacityMt: 350000, primaryWindow: [], secondaryWindow: [], calendarNote: "Granular urea capacity is concentrated at Damietta, Abu Qir and Ain Sokhna." },
  { country: "Morocco", role: "export", monthlyCapacityMt: 180000, primaryWindow: [], secondaryWindow: [], calendarNote: "Phosphate exports run from Jorf Lasfar and Safi on a contract-led programme." },
  { country: "India", role: "import", monthlyCapacityMt: null, primaryWindow: [5, 6, 7], secondaryWindow: [10, 11, 0], calendarNote: "Import demand follows the monsoon and the kharif/rabi application seasons." },
  { country: "Brazil", role: "import", monthlyCapacityMt: null, primaryWindow: [7, 8, 9], secondaryWindow: [0, 1, 2], calendarNote: "Safrinha corn and soybean top-dressing pull imports Aug–Oct." },
  { country: "Saudi Arabia", role: "export", monthlyCapacityMt: 420000, primaryWindow: [], secondaryWindow: [], calendarNote: "Export urea and ammonia capacity centres on Ras Al Khair and Jubail." },
  { country: "Qatar", role: "export", monthlyCapacityMt: 300000, primaryWindow: [], secondaryWindow: [], calendarNote: "Mesaieed exports are largely term-committed to the Indian subcontinent." },
  { country: "Nigeria", role: "import", monthlyCapacityMt: null, primaryWindow: [2, 3, 4], secondaryWindow: [8, 9], calendarNote: "Demand follows the wet-season application window." },
  { country: "Russia", role: "export", monthlyCapacityMt: 520000, primaryWindow: [], secondaryWindow: [], calendarNote: "Baltic and Black Sea export programmes." },
  { country: "China", role: "export", monthlyCapacityMt: 380000, primaryWindow: [], secondaryWindow: [], calendarNote: "Export availability depends on domestic policy windows." },
  { country: "Ukraine", role: "export", monthlyCapacityMt: 160000, primaryWindow: [], secondaryWindow: [], calendarNote: "Black Sea corridor exports, primarily from Yuzhny." },
  { country: "Italy", role: "import", monthlyCapacityMt: null, primaryWindow: [1, 2, 3], secondaryWindow: [9, 10], calendarNote: "Mediterranean demand follows the spring application window." },
  { country: "Greece", role: "import", monthlyCapacityMt: null, primaryWindow: [1, 2, 3], secondaryWindow: [9, 10], calendarNote: "Import demand clusters ahead of the spring top-dressing window." },
];

export function seedAqAnalytics(): AqAnalyticsState {
  const { imports, orders } = buildOrders();
  return {
    version: 1,
    imports,
    orders,
    lineups: LINEUPS,
    producers: PRODUCERS,
    profiles: PROFILES,
    view: [
      { kind: "Market analysis", at: "2026-08-28", title: "Turkish urea buyers hold off as Egyptian offers soften", body: "Buying interest is slow to convert even as December offers ease; buyers are waiting for a clearer floor before covering the rest of the autumn window.", country: "Turkey", product: "Urea" },
      { kind: "Weekly update", at: "2026-08-26", title: "Egyptian urea: December still open as Brazil enquiries build", body: "About 140k MT of November capacity looks uncommitted while enquiry volume from Brazil and Turkey keeps building for December laycans.", country: "Egypt", product: "Urea" },
      { kind: "Trade alert", at: "2026-08-22", title: "Three Handymaxes loading at Yuzhny declared for Brazil", body: "Lineups show three Handymax vessels at berth or anchor, all declaring Brazil — pulling Black Sea tonnage away from the Mediterranean.", country: "Ukraine", product: "Urea" },
      { kind: "Price commentary", at: "2026-08-18", title: "Ammonia and sulphur costs push Med DAP offers higher", body: "Feedstock costs are working through to DAP offers across the Mediterranean, while urea sellers soften to place December tons.", country: null, product: "DAP" },
    ],
    markets: {
      countries: ["Turkey"],
      originCountries: ["Egypt"],
      products: ["Urea", "DAP", "TSP"],
      ports: ["Iskenderun", "Mersin", "Samsun", "Izmir"],
      alertTypes: ["enquiries", "lineups", "shipments", "aqview"],
      channels: ["whatsapp", "email", "inapp"],
      timing: "instant",
      reportEmail: false,
    },
    schedules: [
      { id: "sch-turkey", name: "Turkey weekly", cadence: "Mondays 07:00", market: "Turkey", active: true },
      { id: "sch-egypt", name: "Egypt supply check", cadence: "1st of month", market: "Egypt", active: true },
    ],
    runs: [
      { id: "run-1", name: "Turkey weekly", market: "Turkey", period: "Week to 31 Aug", at: "2026-08-31T07:05:00.000Z" },
      { id: "run-2", name: "Turkey weekly", market: "Turkey", period: "Week to 24 Aug", at: "2026-08-24T07:05:00.000Z" },
      { id: "run-3", name: "Egypt supply check", market: "Egypt", period: "August", at: "2026-08-01T07:05:00.000Z" },
    ],
    accessRequests: [],
  };
}
