import assert from "node:assert/strict";
import test from "node:test";
import { deliveryText, EMPTY_ANSWERS, generateNitrogenReport, monthLabel, orderDeskHref, rateBand, upcomingMonths } from "../nitrogen/engine";
import { evaluateAlerts } from "./alerts";
import type { MemberAlert } from "./member-types";
import { parsePoints, signalFor } from "./signal";
import { DEFAULT_ACCESS, canUse, unlockedModules, type MarketSeries } from "./types";

const urea: MarketSeries = {
  id: "urea-me",
  label: "Urea",
  group: "Nitrogen",
  basis: "FOB Middle East",
  unit: "USD/t",
  points: [
    { date: "2026-08-01", value: 380 },
    { date: "2026-09-01", value: 400 },
    { date: "2026-09-20", value: 410 },
    { date: "2026-09-25", value: 420 },
  ],
};

const alert = (patch: Partial<MemberAlert>): MemberAlert => ({
  id: "a1",
  at: "2026-09-01T00:00:00Z",
  userId: "u1",
  email: "member@example.com",
  seriesId: "urea-me",
  direction: "above",
  threshold: 415,
  note: "",
  active: true,
  lastTriggered: null,
  ...patch,
});

test("pasted prices skip blank values instead of reading them as zero", () => {
  const { points, skipped } = parsePoints("2026-09-01, 400\n2026-09-02,\n2026-09-03;$ 410\nnot a line\n2026-09-01\t405");
  assert.deepEqual(points, [
    { date: "2026-09-01", value: 405 },
    { date: "2026-09-03", value: 410 },
  ]);
  assert.deepEqual(skipped, ["2026-09-02,", "not a line"]);
});

test("a signal window compares the first and latest price inside it", () => {
  const item = signalFor(urea, 30, "2026-09-25");
  assert.equal(item.start, 400);
  assert.equal(item.current, 420);
  assert.equal(item.changePct, 5);
  assert.equal(item.direction, "up");
  assert.equal(item.rangePosition, 100);
  assert.equal(signalFor(urea, 3, "2026-09-25").insufficient, true);
});

test("alerts trigger on the latest price and ignore paused alerts", () => {
  const [above, below, paused] = evaluateAlerts([alert({}), alert({ id: "a2", direction: "below", threshold: 400 }), alert({ id: "a3", active: false })], [urea]);
  assert.equal(above.triggered, true);
  assert.equal(above.distance, -5);
  assert.equal(below.triggered, false);
  assert.equal(below.distance, 20);
  assert.equal(paused.triggered, false);
  assert.equal(evaluateAlerts([alert({ seriesId: "gone" })], [urea])[0].latest, null);
});

test("modules unlock by plan rank, and admins see everything", () => {
  assert.equal(canUse(DEFAULT_ACCESS, "aq-telex", { plan: "core" }), false);
  assert.equal(canUse(DEFAULT_ACCESS, "aq-telex", { plan: "growth" }), true);
  assert.equal(canUse(DEFAULT_ACCESS, "freight-analytics", { plan: "growth" }), true);
  assert.equal(canUse(DEFAULT_ACCESS, "supply-demand", { plan: "growth" }), false);
  assert.equal(canUse(DEFAULT_ACCESS, "supply-demand", { plan: "core", admin: true }), true);
  assert.equal(canUse(DEFAULT_ACCESS, "briefing", null), false);
  assert.equal(unlockedModules(DEFAULT_ACCESS, { plan: "enterprise" }).length, 7);
});

test("the nitrogen report adjusts the rate band for soil and is addressed to the member", () => {
  assert.deepEqual(rateBand("Winter wheat", "Loam"), [170, 220]);
  assert.deepEqual(rateBand("Winter wheat", "Sandy"), [180, 230]);
  assert.equal(rateBand("", "Loam"), null);
  const answers = {
    ...EMPTY_ANSWERS,
    destinationCountry: "Kenya",
    destinationPort: "Mombasa",
    nitrogenSources: ["Urea", "CAN"],
    preferredMonths: ["2026-11", "2027-01"],
    packaging: "Bulk",
    cropType: "Winter wheat",
    soilTexture: "Loam",
    areaHectares: "200",
  };
  const report = generateNitrogenReport(answers, { preparedFor: "Kayode", date: new Date("2026-09-30") });
  assert.match(report, /^# Nitrogen Assessment: Kenya \/ Mombasa \/ Urea, CAN$/m);
  assert.match(report, /\*\*Prepared for:\*\* Kayode/);
  assert.doesNotMatch(report, /Reference|Prepared by/);
  assert.match(report, /\| Parameter \| Value \|\n\|---\|---\|\n\| Crop \| Winter wheat \|/);
  assert.match(report, /\| Preferred months \| November 2026, January 2027 \|/);
  assert.match(report, /\| Shipment packing \| Bulk \|/);
  assert.match(generateNitrogenReport({ ...answers, destinationPort: "" }), /^# Nitrogen Assessment: Kenya \/ Urea, CAN$/m);
});

test("preferred months run twelve months from the current one and older reports keep their window", () => {
  assert.deepEqual(upcomingMonths(new Date("2026-11-15T12:00:00Z"), 3), ["2026-11", "2026-12", "2027-01"]);
  assert.equal(monthLabel("2027-01"), "Jan 2027");
  assert.equal(deliveryText({ preferredMonths: [], deliveryWindow: "Next quarter" }), "Next quarter");
});

test("a report's quote link fills in the order desk product and destination", () => {
  assert.equal(orderDeskHref({ nitrogenSources: ["CAN"], destinationPort: "Mombasa", destinationCountry: "Kenya" }), "/hub/order-desk?product=CAN&destination=Mombasa%2C+Kenya");
  assert.equal(orderDeskHref({ nitrogenSources: ["Unknown"], destinationPort: "", destinationCountry: "" }), "/hub/order-desk");
});
