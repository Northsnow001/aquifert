import assert from "node:assert/strict";
import test from "node:test";
import { isAdminUser, isAllowlistedAdminEmail } from "./admin-access";

test("allowlisted addresses are admin even without the Supabase flag", () => {
  assert.equal(isAdminUser({ email: "campbellstark.nz@gmail.com" }), true);
  assert.equal(isAdminUser({ email: "Kayode@Aquifert.com" }), true);
  assert.equal(isAllowlistedAdminEmail("campbellstark.nz@gmail.com"), true);
});

test("a member is admin when app_metadata says so", () => {
  assert.equal(isAdminUser({ email: "trader@example.com", admin: true }), true);
  assert.equal(isAdminUser({ email: "trader@example.com" }), false);
});

test("missing users are not admin", () => {
  assert.equal(isAdminUser(null), false);
  assert.equal(isAdminUser({ email: "" }), false);
});
