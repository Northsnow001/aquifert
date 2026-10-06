import assert from "node:assert/strict";
import test from "node:test";
import { navFor, tabKeysFor, tabsFor } from "./nav";

test("the free plan has no dashboard in the menu or the phone tab bar", () => {
  assert.equal(navFor("core", false).some((item) => item.key === "dashboard"), false);
  assert.deepEqual(tabKeysFor("core", false), ["home", "library", "telex", "aquibot"]);
});

test("paid plans and admins keep the dashboard", () => {
  for (const [plan, admin] of [["growth", false], ["enterprise", false], ["core", true]] as const) {
    assert.equal(navFor(plan, admin)[0].key, "dashboard");
    assert.equal(tabKeysFor(plan, admin)[0], "dashboard");
  }
});

test("hidden items stay out of the menu on every plan", () => {
  for (const [plan, admin] of [["core", false], ["growth", false], ["enterprise", false], ["core", true]] as const) {
    const keys = navFor(plan, admin).map((item) => item.key);
    for (const key of ["signal", "freight-analytics", "a-telex", "a-market", "a-signal", "a-freight", "a-sd", "a-briefing", "a-alerts"]) {
      assert.equal(keys.includes(key), false, `${key} on ${plan}`);
    }
  }
});

test("AQ Zero and AQ Analytics sit under Plans and open the Buy Fertilizer page", () => {
  const plans = navFor("core", false).filter((item) => item.section === "Plans");
  assert.deepEqual(plans.map((item) => item.key), ["zero", "aq-analytics"]);
  for (const item of plans) {
    assert.equal(item.href, "/hub/order-desk?tab=zero");
    assert.ok(item.promo?.headline);
  }
});

test("the Plans tab holds only AQ Zero and AQ Analytics, account pages stay in Account", () => {
  const plans = tabsFor(navFor("enterprise", false), []).find((tab) => tab.key === "plans");
  assert.deepEqual(plans?.links.map((link) => link.key), ["zero", "aq-analytics"]);
});

test("Trader Tools, User Guide and Contact Us are top-level tabs after Plans", () => {
  const keys = tabsFor(navFor("core", false), []).map((tab) => tab.key);
  assert.deepEqual(keys.slice(keys.indexOf("plans"), keys.indexOf("plans") + 4), ["plans", "tools", "guide", "contact"]);
  const order = tabsFor(navFor("core", false), []).find((tab) => tab.key === "order-group");
  assert.deepEqual(order?.links.map((link) => link.key), ["order"]);
});

test("AQ ONE follows the agreed order", () => {
  const keys = navFor("core", false).filter((item) => item.section === "AQ ONE").map((item) => item.key);
  assert.deepEqual(keys, ["home", "library", "aquibot", "analysis", "telex", "nitrogen", "freight", "netback", "tools", "order", "call"]);
});
