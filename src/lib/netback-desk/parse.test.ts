import assert from "node:assert/strict";
import test from "node:test";
import { NETBACK_CONSTANTS, forwardOrigin, rankForward } from "../netback/calculate";
import { parseNitrogenFile, selectBenchmarks } from "./parse";
import { cleanRequest, computeNetback } from "./run";
import { liveOrigins, seedBenchmarks } from "./types";

const WEEK_28 = [
  "FileType=WeeklyPriceData|Product=Nitrogen|Week=28|Year=2026|PriceDate=2026-07-09|Currency=USD|Unit=per metric tonne unless stated|Source=Aquifert",
  "PriceDate|Week|Year|Granularity|Product|Packaging|Incoterm|Series|Price_Low|Price_High|Price_Mid|Unit",
  "2026-07-09|28|2026|Weekly|Prilled Urea|Bulk|FOB|Baltic|360|370|365|USD/t",
  "2026-07-09|28|2026|Weekly|Prilled Urea|Bulk|FOB|Arab Gulf|375|385|380|USD/t",
  "2026-07-09|28|2026|Weekly|Prilled Urea|Bulk|FOB|China|390|400|395|USD/t",
  "2026-07-09|28|2026|Weekly|Prilled Urea|Bulk|FOB|Shandong ex-works|1765|1775|1770|RMB/t",
  "2026-07-09|28|2026|Weekly|Prilled Urea|Bulk|CFR|Brazil|400|410|405|USD/t",
  "2026-07-09|28|2026|Weekly|Granular Urea|Bulk|FOB|Arab Gulf spot|275|285|280|USD/t",
  "2026-07-09|28|2026|Weekly|Granular Urea|Bulk|FOB|Middle East all netbacks|350|360|355|USD/t",
  "2026-07-09|28|2026|Weekly|Granular Urea|Bulk|FOB|Egypt Europe|435|445|440|USD/t",
  "2026-07-09|28|2026|Weekly|Granular Urea|Bulk|FOB|Egypt|420|430|425|USD/t",
  "2026-07-09|28|2026|Weekly|Granular Urea|Bulk|FOB|Algeria full range|425|435|430|USD/t",
  "2026-07-09|28|2026|Weekly|Granular Urea|Bulk|FOB|Nigeria|390|400|395|USD/t",
  "2026-07-09|28|2026|Weekly|Granular Urea|Bulk|FOB|Black Sea|385|395|390|USD/t",
  "2026-07-09|28|2026|Weekly|Granular Urea|Bulk|FOB|Southeast Asia|405|415|410|USD/t",
  "2026-07-09|28|2026|Weekly|Granular Urea|Bulk|FOB|Iran full range|340|350|345|USD/t",
  "2026-07-09|28|2026|Weekly|Granular Urea|Bulk|FOB|China|380|390|385|USD/t",
  "2026-07-09|28|2026|Weekly|Granular Urea|Bulk|FOB|Egypt Europe|440",
  "2026-07-09|28|2026|Weekly|Ammonia|Bulk|FOB|Black Sea|0|0|0|USD/t",
].join("\r\n");

test("reads the metadata line, header and rows of the weekly file", () => {
  const parsed = parseNitrogenFile(WEEK_28);
  assert.equal(parsed.week, "28");
  assert.equal(parsed.year, "2026");
  assert.equal(parsed.priceDate, "2026-07-09");
  assert.equal(parsed.rows.length, 15);
  assert.deepEqual(
    parsed.skipped.map((line) => [line.line, line.reason]),
    [
      [18, "Has 9 of 12 columns"],
      [19, "No mid price"],
    ],
  );
  const shandong = parsed.rows.find((row) => row.series === "Shandong ex-works");
  assert.equal(shandong?.unit, "RMB/t");
  assert.equal(shandong?.mid, 1770);
});

test("fills the nine benchmarks from FOB urea rows, most specific series first", () => {
  const matches = selectBenchmarks(parseNitrogenFile(WEEK_28).rows);
  const prices = Object.fromEntries(Object.entries(matches).map(([key, row]) => [key, row.mid]));
  assert.deepEqual(prices, { egypt: 440, algeria: 430, nigeria: 395, black_sea: 390, baltic: 365, middle_east: 355, se_asia: 410, iran: 345, china: 385 });
  assert.equal(matches.middle_east.series, "Middle East all netbacks");
  assert.equal(matches.baltic.product, "Prilled Urea");
});

test("granular beats prilled when both use the same series name", () => {
  assert.equal(selectBenchmarks(parseNitrogenFile(WEEK_28).rows).china.product, "Granular Urea");
});

test("CFR, non-urea and non-FOB rows never set a benchmark", () => {
  const text = [
    "PriceDate|Week|Year|Granularity|Product|Packaging|Incoterm|Series|Price_Low|Price_High|Price_Mid|Unit",
    "2026-07-09|28|2026|Weekly|Granular Urea|Bulk|CFR|Egypt|1|1|500|USD/t",
    "2026-07-09|28|2026|Weekly|UAN|Bulk|FOB|Baltic|1|1|300|USD/t",
  ].join("\n");
  assert.deepEqual(selectBenchmarks(parseNitrogenFile(text).rows), {});
});

test("legacy key=value rows and tab-separated pastes are read", () => {
  const legacy = parseNitrogenFile("Row 1: PriceDate=2026-07-02|Week=27|Year=2026|Product=Granular Urea|Incoterm=FOB|Series=Nigeria|Price_Mid=399");
  assert.equal(legacy.rows[0].mid, 399);
  assert.equal(legacy.week, "27");
  const tabs = parseNitrogenFile("PriceDate\tWeek\tYear\tGranularity\tProduct\tPackaging\tIncoterm\tSeries\tPrice_Low\tPrice_High\tPrice_Mid\tUnit\n2026-07-09\t28\t2026\tWeekly\tGranular Urea\tBulk\tFOB\tBaltic\t1,360\t1,370\t1,365\tUSD/t");
  assert.equal(tabs.rows[0].mid, 1365);
});

test("costs passed in replace the built-in constants", () => {
  const base = { key: "x", label: "X", port: "P", freightMt: 40, nauticalMiles: 1, canal: "none", waypoints: "", vessel: "Supramax", basis: "exw" as const, packaging: "bagged" as const, dutyEnabled: false, dutyPercent: 0, afrmm: false, inlandUsd: 0, fob: 585 };
  assert.equal(forwardOrigin(base).totalFarm, 668.11);
  assert.equal(forwardOrigin({ ...base, costs: { ...NETBACK_CONSTANTS, bagged: 20 } }).totalFarm, 676.11);
  const shanghai = { name: "Shanghai", lat: 31.23, lon: 121.47, region: "East Asia" };
  const options = { basis: "exw" as const, packaging: "bagged" as const, dutyEnabled: false, dutyPercent: 0, afrmm: false, inlandUsd: 0 };
  const cheap = rankForward(shanghai, 51000, { ...options, costs: { ...NETBACK_CONSTANTS, bunkerPrice: 500 } });
  const standard = rankForward(shanghai, 51000, options);
  assert.ok(cheap.find((row) => row.key === "iran")!.freightMt < standard.find((row) => row.key === "iran")!.freightMt);
});

test("switched-off and unpriced origins are left out of the ranking", () => {
  const benchmarks = seedBenchmarks().map((item) => (item.key === "iran" ? { ...item, active: false } : item.key === "china" ? { ...item, fob: 0 } : item));
  const origins = liveOrigins(benchmarks);
  assert.equal(origins.length, 7);
  const request = cleanRequest({ mode: "forward", port: "cnsha", cargoMt: 51000 });
  const shanghai = { code: "CNSHA", name: "Shanghai", country: "China", region: "East Asia", lat: 31.23, lon: 121.47 };
  const { forward } = computeNetback({ origins, costs: NETBACK_CONSTANTS, duties: [], week: "" }, request, shanghai);
  assert.deepEqual(forward.map((row) => row.key).slice(0, 2), ["middle_east", "baltic"]);
});

test("the duty record decides AFRMM, not the country name", () => {
  const port = { code: "BRPNG", name: "Paranagua", country: "Brazil", region: "South America", lat: -25.52, lon: -48.51 };
  const config = { origins: liveOrigins(seedBenchmarks()), costs: NETBACK_CONSTANTS, week: "" };
  const request = cleanRequest({ mode: "forward", port: "BRPNG" });
  assert.equal(computeNetback({ ...config, duties: [] }, request, port).afrmm, false);
  assert.equal(computeNetback({ ...config, duties: [{ country: "brazil", rate: 0, active: false, afrmm: true, note: "", tone: "ok" }] }, request, port).afrmm, true);
});

test("requests are clamped to the calculator limits", () => {
  const request = cleanRequest({ cargoMt: 1, dutyPercent: 90, basis: "moon" as never, currency: "usd" });
  assert.equal(request.cargoMt, 5000);
  assert.equal(request.dutyPercent, 50);
  assert.equal(request.basis, "exw");
  assert.equal(request.currency, "USD");
  assert.equal(request.mode, "netback");
});
