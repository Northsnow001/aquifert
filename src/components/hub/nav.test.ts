import assert from "node:assert/strict";
import test from "node:test";
import { ANALYTICS_MENU_KEYS, navFor, tabKeysFor, tabsFor, TOUR_STOPS } from "./nav";

test("the free plan has no dashboard in the menu or the phone tab bar", () => {
  assert.equal(navFor("core", false).some((item) => item.key === "dashboard"), false);
  assert.deepEqual(tabKeysFor("core", false), ["home", "order", "call", "aquibot"]);
});

test("paid plans and admins keep the dashboard", () => {
  for (const [plan, admin] of [["growth", false], ["enterprise", false], ["core", true]] as const) {
    assert.equal(navFor(plan, admin)[0].key, "dashboard");
    assert.deepEqual(tabKeysFor(plan, admin), ["dashboard", "home", "order", "aquibot"]);
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

test("AQ Zero and AQ Analytics keep their own plan pages", () => {
  const plans = navFor("core", false).filter((item) => item.section === "Plans");
  assert.deepEqual(plans.map((item) => item.key), ["zero", "aq-analytics"]);
  assert.deepEqual(plans.map((item) => item.href), ["/hub/plans/aq-zero", "/hub/plans/aq-analytics"]);
  for (const item of plans) assert.ok(item.promo?.headline);
});

test("AQ Analytics sits between Client Suite and Nitrogen Report, with AQ Zero beside it, each as one link", () => {
  for (const [plan, admin] of [["core", false], ["growth", false], ["enterprise", false], ["core", true]] as const) {
    const tabs = tabsFor(navFor(plan, admin), [], { plan, admin });
    const keys = tabs.map((tab) => tab.key);
    assert.deepEqual(keys.slice(keys.indexOf("suite"), keys.indexOf("nitrogen") + 1), ["suite", "aq-analytics", "zero", "nitrogen"]);
    assert.deepEqual(tabs.find((tab) => tab.key === "aq-analytics")?.links.map((link) => link.key), ["aq-analytics"]);
    assert.equal(tabs.find((tab) => tab.key === "aq-analytics")?.links[0].href, "/hub/plans/aq-analytics");
    assert.deepEqual(tabs.find((tab) => tab.key === "zero")?.links.map((link) => link.href), ["/hub/plans/aq-zero"]);
    assert.equal(tabs.find((tab) => tab.key === "aq-analytics")?.links.some((link) => ANALYTICS_MENU_KEYS.includes(link.key as (typeof ANALYTICS_MENU_KEYS)[number])), false);
  }
});

test("an active membership opens the product from the header instead of the subscription page", () => {
  const analytics = tabsFor(navFor("growth", false, true), [], { plan: "growth", admin: false, access: { analytics: true, zero: false } });
  const analyticsLink = analytics.find((tab) => tab.key === "aq-analytics")?.links[0];
  assert.equal(analyticsLink?.href, "/hub/tools/analytics");
  assert.equal(analyticsLink?.match, "/hub/tools/analytics");
  assert.equal(analytics.find((tab) => tab.key === "zero")?.links[0].href, "/hub/plans/aq-zero");

  const both = tabsFor(navFor("enterprise", false, true), [], { plan: "enterprise", admin: false, access: { analytics: true, zero: true } });
  assert.equal(both.find((tab) => tab.key === "aq-analytics")?.links[0].href, "/hub/tools/analytics");
  assert.equal(both.find((tab) => tab.key === "zero")?.links[0].href, "/hub/zero");
  assert.equal(both.find((tab) => tab.key === "zero")?.links[0].match, "/hub/zero");
});

test("AQ ONE does not see the AQ Analytics desk menus", () => {
  const keys = navFor("core", false).map((item) => item.key);
  for (const key of ANALYTICS_MENU_KEYS) assert.equal(keys.includes(key), false);
});

test("Client Suite holds Hub, Telex, AQ View, Library, Calculators and Trader Tools; Trade Desk and Weekly Meetup stay top-level", () => {
  const tabs = tabsFor(navFor("core", false), [], { plan: "core", admin: false });
  const keys = tabs.map((tab) => tab.key);
  assert.deepEqual(tabs.find((tab) => tab.key === "suite")?.links.map((link) => link.key), ["home", "telex", "analysis", "library", "freight", "netback", "tools"]);
  assert.equal(keys.includes("guide"), false);
  assert.equal(keys.includes("aquibot"), false);
  assert.equal(keys.includes("telex-feed"), false);
  assert.equal(tabs.find((tab) => tab.key === "suite")?.links.some((link) => link.href.startsWith("/hub/tools/analytics")), false);
});

test("the tour stops at every desktop tab, in tab-row order, on every plan", () => {
  for (const [plan, admin] of [["core", false], ["growth", false], ["enterprise", false], ["core", true]] as const) {
    const tabs = tabsFor(navFor(plan, admin), [], { plan, admin });
    assert.deepEqual(
      tabs.filter((tab) => !tab.tour).map((tab) => tab.key),
      [],
      `tabs without a tour stop on ${plan}`,
    );
    const order = tabs.map((tab) => TOUR_STOPS.findIndex((stop) => stop.key === tab.tour));
    assert.deepEqual(order, [...order].sort((a, b) => a - b), `tour order on ${plan}`);
  }
});

test("AQ ONE follows the agreed order", () => {
  const keys = navFor("core", false).filter((item) => item.section === "AQ ONE").map((item) => item.key);
  assert.deepEqual(keys, ["home", "library", "aquibot", "analysis", "telex", "nitrogen", "freight", "netback", "tools", "order", "call"]);
});
