import {
  isoDaysAgo,
  paceStatus,
  stageOf,
  vesselBand,
  type BarItem,
  type CountryPace,
  type EnquiryRow,
  type LaneEstimateInput,
  type MapKpis,
  type PaceStatus,
} from "@/lib/aq-analytics/contracts";
import { estimateLaneFromCoords } from "@/lib/aq-analytics/estimate";
import { getAqAnalytics } from "@/lib/aq-analytics/store";
import { qtyOf, weekCommencing, type FreightOrder } from "@/lib/aq-analytics/types";

export const MIN_SAMPLE = 3;

export type BoardFilters = {
  product?: string;
  origin?: string;
  destination?: string;
  account?: string;
  search?: string;
  importId?: string;
  vessel?: string;
  rangeDays?: number;
};

const all = (value?: string) => !value || value === "All";

export async function dataNow() {
  const state = await getAqAnalytics();
  const dates = state.imports.map((item) => item.reportDate).sort();
  return dates[dates.length - 1] ?? "2026-09-03";
}

function matchOrder(order: FreightOrder, f: BoardFilters) {
  if (!all(f.product) && order.product !== f.product) return false;
  if (!all(f.origin) && order.loadCountry !== f.origin) return false;
  if (!all(f.destination) && order.dischCountry !== f.destination) return false;
  if (!all(f.account) && order.account !== f.account) return false;
  if (f.importId && f.importId !== "all" && order.importId !== f.importId) return false;
  if (f.search) {
    const q = f.search.toLowerCase();
    const blob = `${order.loadPort} ${order.dischPort} ${order.loadCountry} ${order.dischCountry} ${order.product} ${order.account}`.toLowerCase();
    if (!blob.includes(q)) return false;
  }
  if (!all(f.vessel) && vesselBand(order.qtyMax) !== f.vessel) return false;
  return true;
}

function ytdSamePeriod(date: string, now: string) {
  const year = Number(now.slice(0, 4));
  const y = Number(date.slice(0, 4));
  if (y !== year) return false;
  return date <= now;
}

function histSamePeriod(date: string, now: string, year: number) {
  if (Number(date.slice(0, 4)) !== year) return false;
  const mmdd = date.slice(5);
  return mmdd <= now.slice(5);
}

export async function mapKpis(product?: string): Promise<MapKpis> {
  const [state, now] = await Promise.all([getAqAnalytics(), dataNow()]);
  const d30 = isoDaysAgo(now, 30);
  const d60 = isoDaysAgo(now, 60);
  const d3 = isoDaysAgo(now, 3);
  const rows = state.orders.filter((order) => all(product) || order.product === product);
  const last30 = rows.filter((order) => order.laycanStart >= d30 && order.laycanStart <= now);
  const prev30 = rows.filter((order) => order.laycanStart >= d60 && order.laycanStart < d30);
  const mt = last30.reduce((s, o) => s + qtyOf(o), 0);
  const prev = prev30.reduce((s, o) => s + qtyOf(o), 0);
  const open = rows.filter((order) => order.laycanEnd >= now);
  const concluded = rows.filter((order) => order.laycanEnd < now && order.laycanEnd >= d30);
  const vessels = state.lineups.reduce((s, row) => s + row.berth + row.anchor + row.expected, 0);
  return {
    enquiredMt30d: mt,
    enquiredWowPct: prev > 0 ? ((mt - prev) / prev) * 100 : null,
    openEnquiries: open.length,
    newLast72h: rows.filter((order) => order.laycanStart >= d3).length,
    vesselsInLineup: vessels,
    lineupPorts: state.lineups.length,
    concludedMt30d: concluded.reduce((s, o) => s + qtyOf(o), 0),
    concludedCountries: new Set(concluded.map((o) => o.dischCountry)).size,
  };
}

export async function paceByCountry(product?: string): Promise<CountryPace[]> {
  const [state, now] = await Promise.all([getAqAnalytics(), dataNow()]);
  const year = Number(now.slice(0, 4));
  const rows = state.orders.filter((order) => all(product) || order.product === product);
  const ytd = new Map<string, { mt: number; n: number }>();
  const hist = new Map<string, number[]>();
  for (const order of rows) {
    if (ytdSamePeriod(order.laycanStart, now)) {
      const cur = ytd.get(order.dischCountry) ?? { mt: 0, n: 0 };
      cur.mt += qtyOf(order);
      cur.n += 1;
      ytd.set(order.dischCountry, cur);
    }
    for (let y = year - 5; y <= year - 1; y += 1) {
      if (histSamePeriod(order.laycanStart, now, y)) {
        const key = `${order.dischCountry}:${y}`;
        hist.set(key, [...(hist.get(key) ?? []), qtyOf(order)]);
      }
    }
  }
  return [...ytd.entries()]
    .map(([country, cur]) => {
      const years: number[] = [];
      for (let y = year - 5; y <= year - 1; y += 1) {
        const vals = hist.get(`${country}:${y}`) ?? [];
        if (vals.length) years.push(vals.reduce((s, v) => s + v, 0));
      }
      const avg = years.length >= MIN_SAMPLE ? years.reduce((s, v) => s + v, 0) / years.length : null;
      const pct = avg && avg > 0 ? ((cur.mt - avg) / avg) * 100 : null;
      return { country, ytdMt: cur.mt, avg5yMt: avg, pctVsAvg: pct, status: paceStatus(pct) as PaceStatus };
    })
    .sort((a, b) => b.ytdMt - a.ytdMt);
}

export async function arcs(product?: string) {
  const [state, now] = await Promise.all([getAqAnalytics(), dataNow()]);
  const from = isoDaysAgo(now, 45);
  return state.orders
    .filter((order) => (all(product) || order.product === product) && order.laycanEnd >= from && order.laycanStart <= now)
    .sort((a, b) => qtyOf(b) - qtyOf(a))
    .slice(0, 60)
    .map((order) => ({
      fromLat: order.loadLat,
      fromLon: order.loadLon,
      toLat: order.dischLat,
      toLon: order.dischLon,
      qty: qtyOf(order),
      load: order.loadPort,
      disch: order.dischPort,
      stage: stageOf(order.laycanStart, order.laycanEnd, now),
    }));
}

export async function aqView(country?: string) {
  const state = await getAqAnalytics();
  return state.view.filter((item) => !country || item.country === country || item.country == null).slice(0, 6);
}

function top(rows: FreightOrder[], key: (o: FreightOrder) => string, limit = 5): BarItem[] {
  const map = new Map<string, BarItem>();
  for (const order of rows) {
    const k = key(order);
    if (!k) continue;
    const cur = map.get(k) ?? { key: k, qty: 0, count: 0 };
    cur.qty += qtyOf(order);
    cur.count += 1;
    map.set(k, cur);
  }
  return [...map.values()].filter((item) => item.count >= MIN_SAMPLE).sort((a, b) => b.qty - a.qty).slice(0, limit);
}

export async function board(f: BoardFilters) {
  const [state, now] = await Promise.all([getAqAnalytics(), dataNow()]);
  const rows = state.orders.filter((order) => matchOrder(order, f));
  const qty = rows.reduce((s, o) => s + qtyOf(o), 0);
  const prevImport = (() => {
    if (!f.importId || f.importId === "all") return [] as FreightOrder[];
    const idx = state.imports.findIndex((item) => item.id === f.importId);
    const prev = idx >= 0 ? state.imports[idx + 1] : undefined;
    return prev ? state.orders.filter((order) => order.importId === prev.id && matchOrder(order, { ...f, importId: prev.id })) : [];
  })();
  const prevQty = prevImport.reduce((s, o) => s + qtyOf(o), 0);
  const week = new Map<string, number>();
  for (const order of rows) {
    const w = weekCommencing(order.laycanStart);
    week.set(w, (week.get(w) ?? 0) + qtyOf(order));
  }
  return {
    now,
    imports: state.imports,
    rows: rows.slice(0, 200),
    total: rows.length,
    qty,
    prevQty: prevImport.length ? prevQty : null,
    open: rows.filter((o) => o.laycanEnd >= now).length,
    vessels: rows.filter((o) => o.orderType === "tonnage").length,
    accounts: new Set(rows.map((o) => o.account)).size,
    origins: top(rows, (o) => o.loadCountry),
    destinations: top(rows, (o) => o.dischCountry),
    loadPorts: top(rows, (o) => o.loadPort),
    dischPorts: top(rows, (o) => o.dischPort),
    products: top(rows, (o) => o.product, 8),
    accountsRank: top(rows, (o) => o.account, 8),
    weeks: [...week.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([weekStart, mt]) => ({ weekStart, mt })),
    options: {
      products: [...new Set(state.orders.map((o) => o.product))].sort(),
      origins: [...new Set(state.orders.map((o) => o.loadCountry))].sort(),
      destinations: [...new Set(state.orders.map((o) => o.dischCountry))].sort(),
      accounts: [...new Set(state.orders.map((o) => o.account))].sort(),
    },
  };
}

export async function enquiryBoard(f: BoardFilters) {
  const [state, now] = await Promise.all([getAqAnalytics(), dataNow()]);
  const range = f.rangeDays ?? 30;
  const from = isoDaysAgo(now, range);
  const mapped: EnquiryRow[] = state.orders
    .filter((order) => order.laycanStart >= from && order.laycanStart <= now && matchOrder(order, f))
    .map((order) => ({
      id: order.id,
      product: order.product,
      qtyMin: order.qtyMin,
      qtyMax: order.qtyMax,
      loadPort: order.loadPort,
      loadCountry: order.loadCountry,
      dischPort: order.dischPort,
      dischCountry: order.dischCountry,
      laycanStart: order.laycanStart,
      laycanEnd: order.laycanEnd,
      enquired: isoDaysAgo(order.laycanStart, 14),
      stage: stageOf(order.laycanStart, order.laycanEnd, now),
    }))
    .sort((a, b) => (b.laycanStart ?? "").localeCompare(a.laycanStart ?? ""));
  const totalQty = mapped.reduce((s, r) => s + (r.qtyMin + r.qtyMax) / 2, 0);
  const weeks = new Map<string, number>();
  for (const row of mapped.filter((r) => r.laycanStart && r.laycanStart > now)) {
    const w = weekCommencing(row.laycanStart!);
    weeks.set(w, (weeks.get(w) ?? 0) + (row.qtyMin + row.qtyMax) / 2);
  }
  return {
    now,
    rows: mapped.slice(0, 60),
    total: mapped.length,
    totalQty,
    bands: VESSEL_BANDS_COUNT(mapped),
    weeks: [...weeks.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([weekStart, mt]) => ({ weekStart, mt })),
    options: {
      products: [...new Set(state.orders.map((o) => o.product))].sort(),
      origins: [...new Set(state.orders.map((o) => o.loadCountry))].sort(),
      destinations: [...new Set(state.orders.map((o) => o.dischCountry))].sort(),
    },
  };
}

function VESSEL_BANDS_COUNT(rows: EnquiryRow[]) {
  const map = new Map<string, number>();
  for (const row of rows) map.set(vesselBand(row.qtyMax), (map.get(vesselBand(row.qtyMax)) ?? 0) + 1);
  return [...map.entries()].map(([band, n]) => ({ band, n }));
}

export async function countryPanel(country: string, product?: string) {
  const [state, now, pace] = await Promise.all([getAqAnalytics(), dataNow(), paceByCountry(product)]);
  const row = pace.find((item) => item.country === country) ?? null;
  const profile = state.profiles.find((item) => item.country === country) ?? null;
  const d30 = isoDaysAgo(now, 30);
  const d90 = isoDaysAgo(now, 90);
  const dest = state.orders.filter((o) => o.dischCountry === country && (all(product) || o.product === product));
  const trend30 = dest.filter((o) => o.laycanStart >= d30 && o.laycanStart <= now).reduce((s, o) => s + qtyOf(o), 0);
  const prev30 = dest.filter((o) => o.laycanStart >= isoDaysAgo(now, 60) && o.laycanStart < d30).reduce((s, o) => s + qtyOf(o), 0);
  const trend90 = dest.filter((o) => o.laycanStart >= d90 && o.laycanStart <= now).reduce((s, o) => s + qtyOf(o), 0);
  const prev90 = dest.filter((o) => o.laycanStart >= isoDaysAgo(now, 180) && o.laycanStart < d90).reduce((s, o) => s + qtyOf(o), 0);
  const open = dest.filter((o) => o.laycanEnd >= now);
  const concluded = dest.filter((o) => o.laycanEnd < now).slice(0, 12);
  const year = Number(now.slice(0, 4));
  const months = Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const cur = dest.filter((o) => o.laycanStart.startsWith(key) && o.laycanStart <= now).reduce((s, o) => s + qtyOf(o), 0);
    const prior = dest.filter((o) => o.laycanStart.startsWith(`${year - 1}-${String(month).padStart(2, "0")}`)).reduce((s, o) => s + qtyOf(o), 0);
    const hist: number[] = [];
    for (let y = year - 5; y <= year - 1; y += 1) {
      hist.push(dest.filter((o) => o.laycanStart.startsWith(`${y}-${String(month).padStart(2, "0")}`)).reduce((s, o) => s + qtyOf(o), 0));
    }
    const avg = hist.reduce((s, v) => s + v, 0) / hist.length;
    return { month, current: cur, prior, avg5y: avg };
  });
  return {
    now,
    country,
    pace: row,
    profile,
    ytd: dest.filter((o) => ytdSamePeriod(o.laycanStart, now)).reduce((s, o) => s + qtyOf(o), 0),
    trend30,
    trend30Pct: prev30 > 0 ? ((trend30 - prev30) / prev30) * 100 : null,
    trend90,
    trend90Pct: prev90 > 0 ? ((trend90 - prev90) / prev90) * 100 : null,
    open: open.slice(0, 12),
    concluded: concluded.filter((_, i, allRows) => allRows.length >= MIN_SAMPLE).slice(0, 12),
    months,
    lineups: state.lineups.filter((item) => item.country === country),
    view: state.view.filter((item) => item.country === country || item.country == null).slice(0, 3),
  };
}

export async function producerPanel(origin: string) {
  const [state, now] = await Promise.all([getAqAnalytics(), dataNow()]);
  const profile = state.profiles.find((item) => item.country === origin) ?? null;
  const rows = state.orders.filter((o) => o.loadCountry === origin);
  const open = rows.filter((o) => o.laycanEnd >= now && stageOf(o.laycanStart, o.laycanEnd, now) === 1);
  const loading = rows.filter((o) => stageOf(o.laycanStart, o.laycanEnd, now) === 2);
  const committed = rows.filter((o) => stageOf(o.laycanStart, o.laycanEnd, now) === 3 && o.laycanEnd >= isoDaysAgo(now, 30));
  const openMt = open.reduce((s, o) => s + qtyOf(o), 0);
  const loadingMt = loading.reduce((s, o) => s + qtyOf(o), 0);
  const committedMt = committed.reduce((s, o) => s + qtyOf(o), 0);
  const capacity = profile?.monthlyCapacityMt ?? null;
  const headroom = capacity == null ? null : capacity - (openMt + loadingMt + committedMt) / 3;
  const months = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(`${now}T00:00:00`);
    d.setMonth(d.getMonth() - (7 - i));
    const key = d.toISOString().slice(0, 7);
    return { month: key, mt: rows.filter((o) => o.laycanStart.startsWith(key)).reduce((s, o) => s + qtyOf(o), 0) };
  });
  return {
    now,
    origin,
    profile,
    openMt,
    loadingMt,
    committedMt,
    headroom,
    capacity,
    months,
    producers: state.producers.filter((item) => item.country === origin),
    who: top(open.concat(loading), (o) => o.dischCountry, 6),
    lineups: state.lineups.filter((item) => item.country === origin),
  };
}

export async function listPorts() {
  const state = await getAqAnalytics();
  const load = new Map<string, { port: string; country: string; lat: number; lon: number; mt: number }>();
  const disch = new Map<string, { port: string; country: string; lat: number; lon: number; mt: number }>();
  for (const order of state.orders) {
    const l = load.get(order.loadPort) ?? { port: order.loadPort, country: order.loadCountry, lat: order.loadLat, lon: order.loadLon, mt: 0 };
    l.mt += qtyOf(order);
    load.set(order.loadPort, l);
    const d = disch.get(order.dischPort) ?? { port: order.dischPort, country: order.dischCountry, lat: order.dischLat, lon: order.dischLon, mt: 0 };
    d.mt += qtyOf(order);
    disch.set(order.dischPort, d);
  }
  return {
    load: [...load.values()].sort((a, b) => b.mt - a.mt),
    disch: [...disch.values()].sort((a, b) => b.mt - a.mt),
  };
}

export async function estimateLane(input: LaneEstimateInput) {
  const ports = await listPorts();
  const from = ports.load.find((p) => p.port === input.loadPort);
  const to = ports.disch.find((p) => p.port === input.dischPort);
  if (!from || !to) throw new Error("Unknown port — pick a port from the list.");
  return estimateLaneFromCoords(from, to, input);
}

export async function marketReport(market: string, period: "30" | "90" = "30") {
  const [state, now, pace] = await Promise.all([getAqAnalytics(), dataNow(), paceByCountry()]);
  const days = period === "90" ? 90 : 30;
  const from = isoDaysAgo(now, days);
  const dest = state.orders.filter((o) => o.dischCountry === market && o.laycanStart >= from && o.laycanStart <= now);
  const countryPace = pace.find((p) => p.country === market);
  const products = top(dest, (o) => o.product, 8);
  const origins = top(dest, (o) => o.loadCountry, 6);
  const lanes = top(dest, (o) => `${o.loadPort} → ${o.dischPort}`, 6);
  return {
    now,
    market,
    period: `Last ${days} days to ${now}`,
    pace: countryPace,
    products,
    origins,
    lanes,
    open: dest.filter((o) => o.laycanEnd >= now).length,
    mt: dest.reduce((s, o) => s + qtyOf(o), 0),
    view: state.view.filter((item) => item.country === market || item.country == null).slice(0, 2),
    bullets: [
      countryPace?.pctVsAvg != null
        ? `${market} is tracking ${countryPace.pctVsAvg >= 0 ? "ahead of" : "behind"} its five-year average (${countryPace.pctVsAvg.toFixed(1)}%).`
        : `${market} does not yet have enough history for a pace reading.`,
      `${dest.length} freight enquiries totalling ${Math.round(dest.reduce((s, o) => s + qtyOf(o), 0)).toLocaleString("en-GB")} MT in the period.`,
      origins[0] ? `Leading origin: ${origins[0].key} (${Math.round(origins[0].qty).toLocaleString("en-GB")} MT).` : "No origin concentration in this window.",
    ],
  };
}

export async function alertsPreview() {
  const [state, now] = await Promise.all([getAqAnalytics(), dataNow()]);
  const types = new Set(state.markets.alertTypes);
  const items: { type: string; channel: string; title: string; at: string }[] = [];
  if (types.has("enquiries")) {
    for (const order of state.orders.filter((o) => o.laycanStart >= isoDaysAgo(now, 7)).slice(0, 4)) {
      items.push({
        type: "enquiries",
        channel: state.markets.channels[0] ?? "inapp",
        title: `${order.product} ${order.qtyMax.toLocaleString("en-GB")} MT ${order.loadPort} → ${order.dischPort}`,
        at: order.laycanStart,
      });
    }
  }
  if (types.has("lineups")) {
    for (const row of state.lineups.slice(0, 3)) {
      items.push({ type: "lineups", channel: "email", title: `${row.port}: ${row.berth} berth / ${row.anchor} anchor (sample AIS)`, at: now });
    }
  }
  if (types.has("aqview")) {
    for (const item of state.view.slice(0, 2)) items.push({ type: "aqview", channel: "inapp", title: item.title, at: item.at });
  }
  if (types.has("shipments")) {
    items.push({ type: "shipments", channel: "whatsapp", title: "Concluded laycans in the last 7 days on followed markets", at: now });
  }
  return { now, markets: state.markets, items };
}

export async function botAnswer(question: string) {
  const [now, kpis, pace] = await Promise.all([dataNow(), mapKpis(), paceByCountry()]);
  const turkey = pace.find((p) => p.country === "Turkey");
  const q = question.toLowerCase();
  const facts: string[] = [];
  if (q.includes("pace") || q.includes("turkey") || q.includes("market")) {
    facts.push(
      turkey?.pctVsAvg != null
        ? `Turkey YTD imports ${Math.round(turkey.ytdMt).toLocaleString("en-GB")} MT, ${turkey.pctVsAvg.toFixed(1)}% vs five-year average (${turkey.status}).`
        : "Turkey does not have enough years of coverage for a pace figure.",
    );
  }
  if (q.includes("freight") || q.includes("enquir") || q.includes("lane") || facts.length === 0) {
    facts.push(
      `Stage 1 quantity enquired in the last 30 days: ${Math.round(kpis.enquiredMt30d).toLocaleString("en-GB")} MT across ${kpis.openEnquiries} open enquiries.`,
      `Stage 2 sample lineups: ${kpis.vesselsInLineup} vessels at ${kpis.lineupPorts} ports (sample AIS).`,
      `Stage 3 concluded: ${Math.round(kpis.concludedMt30d).toLocaleString("en-GB")} MT.`,
    );
  }
  return {
    text: facts.join(" "),
    sources: `Sources: freight enquiry pipeline · BL data to ${now}`,
    insight: false,
  };
}
