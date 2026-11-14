import assert from "node:assert/strict";
import test from "node:test";
import { existingAccountKind, phoneToE164 } from "./auth-signup";

test("phoneToE164 accepts a country code and ignores spacing", () => {
  assert.equal(phoneToE164("+44 7400 123456"), "+447400123456");
  assert.equal(phoneToE164("00447400123456"), "+447400123456");
  assert.equal(phoneToE164("+1 (415) 555-2671"), "+14155552671");
});

test("phoneToE164 rejects numbers without a country code", () => {
  assert.equal(phoneToE164("07400123456"), null);
  assert.equal(phoneToE164(""), null);
  assert.equal(phoneToE164("+123"), null);
});

test("existingAccountKind tells an email conflict from a phone conflict", () => {
  assert.equal(existingAccountKind("A user with this email address has already been registered"), "email");
  assert.equal(existingAccountKind("Phone number already registered"), "phone");
  assert.equal(existingAccountKind("Error sending sms"), null);
});
