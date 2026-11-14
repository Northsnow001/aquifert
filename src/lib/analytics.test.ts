import assert from "node:assert/strict";
import test from "node:test";
import { cleanParams, contentGroup } from "./analytics.ts";

test("content groups follow the part of Aquifert someone is using", () => {
  assert.equal(contentGroup("/"), "Marketing");
  assert.equal(contentGroup("/membership"), "Marketing");
  assert.equal(contentGroup("/login"), "Account");
  assert.equal(contentGroup("/register"), "Account");
  assert.equal(contentGroup("/verify-email"), "Account");
  assert.equal(contentGroup("/hub"), "Hub");
  assert.equal(contentGroup("/hub/freight-calculator"), "Hub");
  assert.equal(contentGroup("/admin/settings"), "Admin");
});

test("event details drop blank values and email addresses", () => {
  assert.deepEqual(
    cleanParams({ form_name: "contact", method: "message", email: "ada@aquifert.com", note: "  hello  ", empty: "" }),
    { form_name: "contact", method: "message", note: "hello" },
  );
});
