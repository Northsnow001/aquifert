import assert from "node:assert/strict";
import test from "node:test";
import { cleanFixture, fixtureProblem, parseAiBdi, parseAiFixtures, parseBdiPage, parseBunkerPrices, parseFixtureSheet, parseRange } from "./parse";

test("ranges read the way brokers write them", () => {
  assert.deepEqual(parseRange("10-15"), [10, 15]);
  assert.deepEqual(parseRange("28/29"), [28, 29]);
  assert.deepEqual(parseRange("28.5 to 30"), [28.5, 30]);
  assert.deepEqual(parseRange("$44"), [44, 44]);
  assert.deepEqual(parseRange("tbc"), [0, 0]);
});

test("fixtures are normalised whatever the source", () => {
  const clean = cleanFixture({ loadName: "  Damietta ", dischargeName: "Constanta", rateLow: 31, rateHigh: 28, cargoMaxKt: 10, loadRegion: "north africa", loadCode: "egdam" });
  assert.equal(clean.loadName, "Damietta");
  assert.equal(clean.loadCode, "EGDAM");
  assert.equal(clean.loadRegion, "North Africa");
  assert.deepEqual([clean.rateLow, clean.rateHigh], [28, 31]);
  assert.deepEqual([clean.cargoMinKt, clean.cargoMaxKt], [10, 10]);
  assert.equal(clean.source, "Manual entry");
  assert.match(clean.fixtureDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(cleanFixture({ loadRegion: "Atlantis" }).loadRegion, "");
});

test("fixtures without a route or a sane rate are rejected", () => {
  assert.match(fixtureProblem(cleanFixture({ dischargeName: "Constanta", rateLow: 20 })) ?? "", /load/);
  assert.match(fixtureProblem(cleanFixture({ loadName: "A", dischargeName: "B" })) ?? "", /rate/);
  assert.match(fixtureProblem(cleanFixture({ loadName: "A", dischargeName: "B", rateLow: 900 })) ?? "", /typo/);
  assert.equal(fixtureProblem(cleanFixture({ loadName: "A", dischargeName: "B", rateLow: 20 })), null);
});

test("pasted sheets skip headers, group rows under a region line and report bad lines", () => {
  const sheet = [
    "Load\tDischarge\tCargo\tRate",
    "Damietta\tConstanta\t10\t28/29\tFertilizer\tBroker A\t2026-07-01",
    "Baltic",
    "Brazil\t30-35\t44.5/46",
    "US Gulf\t25",
    "Riga,Santos,30,n/a",
  ].join("\n");
  const { rows, errors } = parseFixtureSheet(sheet, "Pasted");
  assert.equal(rows.length, 2);
  assert.deepEqual(
    { load: rows[0].loadName, rate: [rows[0].rateLow, rows[0].rateHigh], type: rows[0].cargoType, source: rows[0].source, date: rows[0].fixtureDate },
    { load: "Damietta", rate: [28, 29], type: "Fertilizer", source: "Broker A", date: "2026-07-01" },
  );
  assert.deepEqual({ load: rows[1].loadName, region: rows[1].loadRegion, cargo: [rows[1].cargoMinKt, rows[1].cargoMaxKt], source: rows[1].source }, { load: "Baltic", region: "Baltic", cargo: [30, 35], source: "Pasted" });
  assert.deepEqual(errors.map((error) => error.line), [5, 6]);
});

test("Gemini fixture JSON is read through fences, loose keys and range strings", () => {
  const rows = parseAiFixtures('```json\n{"fixtures":[{"Load":"US Gulf","Discharge":"Brazil","cargo":"25-30","rate":"38/40","confidence":0.6},{"load":"X","discharge":"","rate":10}]}\n```', "Sheet.pdf");
  assert.equal(rows.length, 1);
  assert.deepEqual([rows[0].cargoMinKt, rows[0].cargoMaxKt, rows[0].rateLow, rows[0].rateHigh], [25, 30, 38, 40]);
  assert.equal(rows[0].source, "Sheet.pdf");
  assert.equal(rows[0].confidence, 0.6);
  assert.deepEqual(parseAiFixtures("no json here"), []);
});

test("market pages yield bunker prices and the BDI", () => {
  const html = "<table><tr><th>Port</th><th>Price</th></tr><tr><td>Singapore</td><td>$512.50</td></tr></table><p>Rotterdam VLSFO 488.00 up</p>";
  assert.deepEqual(parseBunkerPrices(html, ["Singapore", "Rotterdam", "Fujairah"]), [
    { city: "Singapore", price: 512.5 },
    { city: "Rotterdam", price: 488 },
  ]);
  assert.deepEqual(parseBdiPage("<p>The Baltic Dry Index rose to 1,742 Index Points on September 29, 2026.</p>"), { value: 1742, tradeDate: "2026-09-29" });
  assert.equal(parseBdiPage("<p>nothing</p>"), null);
  assert.deepEqual(parseAiBdi('{"value": 1650.4, "trade_date": "2026-09-28"}'), { value: 1650, tradeDate: "2026-09-28" });
  assert.equal(parseAiBdi('{"error":"not found"}'), null);
});
