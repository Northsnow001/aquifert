import assert from "node:assert/strict";
import test from "node:test";
import { blendRate } from "./fixtures";
import { quoteFreight } from "./calculate";

test("supramax worked example matches the freight formula document", () => {
  const quote = quoteFreight({
    cargoMt: 50000,
    cargoPremium: 5,
    market: "normal",
    loadRegion: "Middle East",
    distanceNm: 6000,
    canal: "suez",
    bunkerPrice: 600,
    bdi: 2044,
    iranWarRisk: false,
  });

  assert.equal(quote.vessel, "supramax");
  assert.equal(quote.dailyHire, 15330);
  assert.ok(Math.abs(quote.seaDays - 20) < 0.01);
  assert.ok(Math.abs(quote.totalDays - 32.045) < 0.01);
  assert.ok(Math.abs(quote.bunkerCost - 615273) < 2);
  assert.equal(quote.canalCost, 225000);
  assert.ok(Math.abs(quote.voyageCost - 866273) < 2);
  assert.ok(Math.abs(quote.baseRate - 27.15) < 0.02);
  assert.ok(Math.abs(quote.taper - 0.95) < 0.001);
  assert.ok(Math.abs(quote.algorithmRate - 36.18) < 0.02);
});

test("an in-band fixture leaves the algorithm rate unchanged", () => {
  const blend = blendRate(40, {
    matchType: "exact_port_pair",
    windowDays: 90,
    sampleSize: 5,
    cargoMatchMode: "in_band",
    rateMin: 30,
    rateMax: 45,
    rateMedian: 50,
  });
  assert.equal(blend.displayRate, 40);
  assert.equal(blend.inRange, true);
});

test("an out-of-band exact fixture blends toward the median", () => {
  const blend = blendRate(40, {
    matchType: "exact_port_pair",
    windowDays: 90,
    sampleSize: 5,
    cargoMatchMode: "in_band",
    rateMin: 48,
    rateMax: 52,
    rateMedian: 50,
  });
  assert.ok(Math.abs(blend.displayRate - 48.26) < 0.05);
});
