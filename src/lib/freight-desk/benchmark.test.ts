import assert from "node:assert/strict";
import test from "node:test";
import { findPort, PORTS, type PortRecord } from "@/lib/ports";
import { findBenchmarkBand, fixtureResolver, indexPorts, resolveLeg } from "./benchmark";
import type { Fixture } from "./types";

const NOW = Date.parse("2026-09-30T12:00:00Z");
const index = indexPorts(PORTS);
const port = (code: string) => findPort(code) as PortRecord;
const daysAgo = (days: number) => new Date(NOW - days * 86_400_000).toISOString().slice(0, 10);

let seq = 0;
function fixture(load: string, discharge: string, rate: number, extra: Partial<Fixture> = {}): Fixture {
  seq += 1;
  return {
    id: `f${seq}`,
    loadName: load,
    loadCode: "",
    loadRegion: "",
    dischargeName: discharge,
    dischargeCode: "",
    dischargeRegion: "",
    cargoMinKt: 25,
    cargoMaxKt: 35,
    rateLow: rate,
    rateHigh: rate,
    cargoType: "",
    source: "test",
    fixtureDate: daysAgo(10),
    origin: "manual",
    batchId: null,
    confidence: 1,
    excerpt: "",
    status: "active",
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    ...extra,
  };
}

function band(load: string, discharge: string, fixtures: Fixture[], cargoMt = 30_000) {
  return findBenchmarkBand({ load: port(load), discharge: port(discharge), cargoMt, fixtures, resolve: fixtureResolver(index), now: NOW });
}

test("fixture legs resolve as the broker wrote them", () => {
  assert.equal(resolveLeg(index, "anything", "EGDAM").match, "port");
  assert.deepEqual(resolveLeg(index, "Bombay").codes, ["INBOM"]);
  assert.equal(resolveLeg(index, "Brazil").match, "country");
  assert.equal(resolveLeg(index, "US Gulf").match, "area");
  assert.equal(resolveLeg(index, "baltic").match, "region");
  assert.equal(resolveLeg(index, "SE Asia").label, "Southeast Asia");
  assert.equal(resolveLeg(index, "Atlantis").match, "unknown");
});

test("an exact port pair wins over wider matches", () => {
  const exact = fixture("Santos", "Damietta", 30);
  const result = band("BRSTS", "EGDAM", [exact, fixture("Brazil", "Egypt", 50)]);
  assert.equal(result?.matchType, "exact_port_pair");
  assert.deepEqual(result?.fixtureIds, [exact.id]);
});

test("a country-level fixture is a country match, never an exact port match", () => {
  const result = band("BRSTS", "EGDAM", [fixture("Brazil", "Egypt", 50)]);
  assert.equal(result?.matchType, "country_pair");
  assert.equal(result?.rateMedian, 50);
});

test("area and region fixtures match at their own tier", () => {
  assert.equal(band("USHOU", "BRSTS", [fixture("Houston", "Brazil", 38)])?.matchType, "country_pair");
  assert.equal(band("USHOU", "BRSTS", [fixture("US Gulf", "Brazil", 38)])?.matchType, "area_pair");
  assert.equal(band("USHOU", "INBOM", [fixture("US Gulf", "Indian Subcontinent", 45)])?.matchType, "region_pair");
  assert.equal(band("LVRIX", "BRSTS", [fixture("Baltic", "South America", 44)])?.matchType, "region_pair");
  assert.equal(band("LVRIX", "EGDAM", [fixture("Baltic", "South America", 44)])?.matchType, "wide");
});

test("the shortest window with fixtures is used", () => {
  const result = band("BRSTS", "EGDAM", [fixture("Santos", "Damietta", 30, { fixtureDate: daysAgo(120) })]);
  assert.equal(result?.windowDays, 180);
});

test("cargo outside the band falls back to near band, then to a wide match", () => {
  const near = band("BRSTS", "EGDAM", [fixture("Santos", "Damietta", 30, { cargoMinKt: 20, cargoMaxKt: 26 })]);
  assert.equal(near?.cargoMatchMode, "near_band");
  const far = band("BRSTS", "EGDAM", [fixture("Santos", "Damietta", 30, { cargoMinKt: 5, cargoMaxKt: 10 })]);
  assert.equal(far?.matchType, "wide");
});

test("inactive fixtures and rates of zero are ignored", () => {
  assert.equal(band("BRSTS", "EGDAM", [fixture("Santos", "Damietta", 30, { status: "inactive" }), fixture("Santos", "Damietta", 0)]), null);
});

test("outlier midpoints are trimmed from the band", () => {
  const rows = [20, 29, 30, 31, 32, 80].map((rate) => fixture("Santos", "Damietta", rate));
  const result = band("BRSTS", "EGDAM", rows);
  assert.equal(result?.sampleSize, 4);
  assert.equal(result?.rateMin, 29);
  assert.equal(result?.rateMax, 32);
});

test("a route with only a shared load port gets a wide, score-weighted band", () => {
  const result = band("BRSTS", "EGDAM", [fixture("Santos", "Constanta", 35)]);
  assert.equal(result?.matchType, "wide");
  assert.equal(result?.rateMedian, 35);
});

test("editing a fixture re-resolves it even when the id is unchanged", () => {
  const resolve = fixtureResolver(index);
  const original = fixture("Santos", "Damietta", 30);
  assert.equal(resolve(original).discharge.codes[0], "EGDAM");
  const edited = { ...original, dischargeName: "Constanta", updatedAt: "2026-09-02T00:00:00Z" };
  assert.equal(resolve(edited).discharge.codes[0], "ROCND");
});
