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
