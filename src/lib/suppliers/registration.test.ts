import assert from "node:assert/strict";
import test from "node:test";
import { normaliseSupplierCode, parseSupplierRegistration } from "./registration";

const now = new Date("2026-10-15T12:00:00Z");

test("agreeing sends the code and email from the invite link", () => {
  const result = parseSupplierRegistration({ code: " sup-002 ", email: "Sales@Example.com ", consent: true }, now);
  assert.ok(result.ok);
  assert.deepEqual(result.value, {
    code: "SUP-002",
    email: "sales@example.com",
    status: "form_done",
    form_submitted_at: "2026-10-15T12:00:00.000Z",
  });
});

test("a missing or malformed code or email is dropped, not refused", () => {
  const result = parseSupplierRegistration({ code: "SUP/002", email: "not-an-email", consent: true }, now);
  assert.ok(result.ok);
  assert.equal(result.value.code, "");
  assert.equal(result.value.email, "");
});

test("submitting without ticking the box is refused", () => {
  for (const consent of [undefined, false, "yes"]) {
    const result = parseSupplierRegistration({ code: "SUP-002", consent }, now);
    assert.equal(result.ok, false, String(consent));
    if (!result.ok) assert.match(result.error, /agree/);
  }
});

test("supplier codes are matched however they are typed", () => {
  assert.equal(normaliseSupplierCode("sup 002"), "SUP002");
  assert.equal(normaliseSupplierCode(" Sup-003\n"), "SUP-003");
  assert.equal(normaliseSupplierCode(42), "");
});
