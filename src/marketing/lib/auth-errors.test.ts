import assert from "node:assert/strict";
import test from "node:test";
import { friendlyAuthError } from "./auth-errors";

test("login maps credential and confirmation errors", () => {
  assert.match(friendlyAuthError("Invalid login credentials", "login"), /invitation email/);
  assert.match(friendlyAuthError("Email not confirmed", "login"), /verification code or an invitation/);
});

test("signup maps an existing account to sign-in guidance", () => {
  assert.match(friendlyAuthError("User already registered", "signup"), /already has an account/);
});
