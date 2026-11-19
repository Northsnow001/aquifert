import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fmtDayYear, paceStatus, stageOf, vesselBand } from "@/lib/aq-analytics/contracts";
import { estimateLaneFromCoords } from "@/lib/aq-analytics/estimate";
import { seedAqAnalytics } from "@/lib/aq-analytics/seed";
import { weekCommencing } from "@/lib/aq-analytics/types";

describe("aq analytics contracts", () => {
  it("classifies stages against dataNow", () => {
    assert.equal(stageOf("2026-08-01", "2026-08-20", "2026-09-03"), 3);
    assert.equal(stageOf("2026-09-01", "2026-09-20", "2026-09-03"), 2);
    assert.equal(stageOf("2026-10-01", "2026-10-20", "2026-09-03"), 1);
  });

  it("maps vessel bands from quantity", () => {
    assert.equal(vesselBand(18000), "Handysize");
    assert.equal(vesselBand(45000), "Handymax / Supramax");
    assert.equal(vesselBand(60000), "Ultramax");
    assert.equal(vesselBand(72000), "Panamax");
  });

  it("uses the four-percent pace bands", () => {
    assert.equal(paceStatus(4), "ahead");
    assert.equal(paceStatus(3.9), "on");
    assert.equal(paceStatus(-4), "behind");
    assert.equal(paceStatus(null), "gap");
  });

  it("formats dates as DD MMM YYYY", () => {
    assert.match(fmtDayYear("2026-09-03"), /^3 Sep/);
    assert.match(fmtDayYear("2026-09-03"), /2026$/);
  });
});

describe("seed corpus", () => {
  it("anchors dataNow on 3 Sept 2026 and spans five prior years", () => {
    const seed = seedAqAnalytics();
    const last = [...seed.imports].sort((a, b) => a.reportDate.localeCompare(b.reportDate)).at(-1);
    assert.equal(last?.reportDate, "2026-09-03");
    assert.ok(seed.orders.length > 200);
    const years = new Set(seed.orders.map((row) => row.laycanStart.slice(0, 4)));
    assert.ok(years.has("2021"));
    assert.ok(years.has("2026"));
    assert.ok(seed.producers.every((row) => row.label.startsWith("Producer ")));
  });

  it("buckets weeks Monday-commencing", () => {
    assert.equal(weekCommencing("2026-09-03"), "2026-08-31");
  });
});

describe("lane estimate", () => {
  it("returns a stable Damietta–Iskenderun voyage", () => {
    const a = estimateLaneFromCoords(
      { port: "Damietta", lat: 31.42, lon: 31.81 },
      { port: "Iskenderun", lat: 36.58, lon: 36.17 },
      {
        loadPort: "Damietta",
        dischPort: "Iskenderun",
        product: "Urea",
        quantityMt: 30000,
        market: "normal",
        loadPortCostUsd: 28000,
        dischPortCostUsd: 32000,
        agencyUsd: 12000,
        extraPortDays: 0,
        cfrPriceUsd: 318,
      },
    );
    assert.equal(a.bdiReference, 1642);
    assert.ok(a.freightPerMt > 0);
    assert.equal(a.fobNetback, Math.round((318 - a.freightPerMt) * 100) / 100);
    assert.match(a.method, /1\.18/);
  });
});
