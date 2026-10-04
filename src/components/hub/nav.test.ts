import assert from "node:assert/strict";
import test from "node:test";
import { navFor, tabKeysFor } from "./nav";

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

test("AQ Zero and AQ Analytics sit under Plans and open the membership page", () => {
  const plans = navFor("core", false).filter((item) => item.section === "Plans");
  assert.deepEqual(plans.map((item) => item.key), ["zero", "aq-analytics"]);
  for (const item of plans) {
    assert.ok(item.href.startsWith("/hub/account/membership"));
    assert.ok(item.promo?.headline);
  }
});

test("AQ ONE follows the agreed order", () => {
  const keys = navFor("core", false).filter((item) => item.section === "AQ ONE").map((item) => item.key);
  assert.deepEqual(keys, ["home", "library", "aquibot", "analysis", "telex", "nitrogen", "freight", "netback", "tools", "order", "call"]);
});
