import assert from "node:assert/strict";
import test from "node:test";
import { IDLE_LIMIT_MS, IDLE_SERVER_GRACE_MS, IDLE_WARN_MS, idleState, safeReturnPath } from "./idle-timeout";

const now = Date.parse("2026-10-07T12:00:00Z");
const ago = (ms: number) => String(now - ms);

test("the warning comes two minutes before the session ends", () => {
  assert.equal(IDLE_LIMIT_MS, 15 * 60_000);
  assert.equal(IDLE_LIMIT_MS - IDLE_WARN_MS, 2 * 60_000);
});

test("a session with no activity stamp starts fresh", () => {
  for (const stamp of [undefined, "", "abc", "0", "-5"]) assert.equal(idleState(stamp, { now }), "fresh", String(stamp));
});

test("the server ends the session only once the limit and its grace have passed", () => {
  assert.equal(idleState(ago(14 * 60_000), { now }), "active");
  assert.equal(idleState(ago(IDLE_LIMIT_MS), { now }), "active", "the browser ends it first; the server waits out the heartbeat delay");
  assert.equal(idleState(ago(IDLE_LIMIT_MS + IDLE_SERVER_GRACE_MS - 1), { now }), "active");
  assert.equal(idleState(ago(IDLE_LIMIT_MS + IDLE_SERVER_GRACE_MS), { now }), "expired");
  assert.equal(idleState(ago(3 * 60 * 60_000), { now }), "expired", "a laptop left asleep for hours");
});

test("a stamp left over from an earlier sign-in does not end a new session", () => {
  const stale = ago(2 * 24 * 60 * 60_000);
  assert.equal(idleState(stale, { now, signedInAt: new Date(now - 5_000).toISOString() }), "fresh");
  assert.equal(idleState(stale, { now, signedInAt: new Date(now - 3 * 24 * 60 * 60_000).toISOString() }), "expired");
  assert.equal(idleState(stale, { now, signedInAt: "not a date" }), "expired");
});

test("after re-auth, members only return to pages on this site", () => {
  for (const ok of ["/hub", "/hub/telex/12?tab=all", "/admin/site-content?page=home"]) assert.equal(safeReturnPath(ok), ok);
  for (const bad of [null, "", "hub", "//evil.example", "/\\evil.example", "https://evil.example", "javascript:alert(1)", "/login", "/session-expired?redirect_to=/hub"]) {
    assert.equal(safeReturnPath(bad), null, String(bad));
  }
});
