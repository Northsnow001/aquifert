import assert from "node:assert/strict";
import test from "node:test";
import { forwardOrigin, rankForward, reverseOrigin } from "./calculate";

const shared = {
  key: "middle_east",
  label: "Middle East",
  port: "Ruwais",
  freightMt: 40,
  nauticalMiles: 1000,
  canal: "none",
  waypoints: "Direct",
  basis: "exw" as const,
  packaging: "bagged" as const,
  dutyEnabled: false,
  dutyPercent: 0,
  afrmm: false,
  inlandUsd: 0,
};

test("FOB to farm-gate matches the netback worked example", () => {
  const result = forwardOrigin({ ...shared, fob: 585, vessel: "Supramax" });
  assert.equal(result.cfr, 625);
  assert.equal(result.finCost, 4.11);
  assert.equal(result.totalFarm, 668.11);
});

test("farm price built from a benchmark solves back to that FOB", () => {
  const result = reverseOrigin({ ...shared, actualFob: 585, farmUsd: 668.11 });
  assert.equal(result.impliedCfr, 625);
  assert.equal(result.impliedFob, 585);
  assert.equal(result.margin, 0);
  assert.equal(result.status, "Marginal");
});

test("forward duty uses CFR plus insurance", () => {
  const result = forwardOrigin({
    ...shared,
    fob: 585,
    vessel: "Supramax",
    dutyEnabled: true,
    dutyPercent: 5,
  });
  assert.equal(result.dutyCost, 31.3);
  assert.equal(result.totalFarm, 699.41);
});

test("Shanghai week 28 bagged EXW matches the published hub", () => {
  const ranked = rankForward(
    { name: "Shanghai", lat: 31.23, lon: 121.47, region: "East Asia" },
    51000,
    {
      basis: "exw",
      packaging: "bagged",
      dutyEnabled: true,
      dutyPercent: 0,
      afrmm: false,
      inlandUsd: 0,
    },
  );
  const iran = ranked.find((origin) => origin.key === "iran");
  assert.ok(iran);
  assert.equal(iran.fob, 345);
  assert.equal(iran.freightMt, 37.74);
  assert.equal(iran.nauticalMiles, 5385);
  assert.equal(iran.waypoints, "Hormuz → Malacca");
  assert.equal(iran.cfr, 382.74);
  assert.equal(iran.finCost, 2.52);
  assert.equal(iran.totalFarm, 424.26);
  assert.deepEqual(
    ranked.map((origin) => origin.key),
    ["iran", "middle_east", "china", "baltic", "se_asia", "nigeria", "black_sea", "algeria", "egypt"],
  );
  assert.equal(ranked[1].totalFarm, 434.55);
  assert.equal(ranked[2].totalFarm, 458.11);
  assert.equal(ranked[3].totalFarm, 465.93);
  assert.equal(ranked[4].totalFarm, 478.41);
  assert.equal(ranked[5].totalFarm, 483.63);
  assert.equal(ranked[7].totalFarm, 526.56);
  assert.equal(ranked[8].totalFarm, 541.84);
});
