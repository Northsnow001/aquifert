import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { inviteScene, supplierInviteEligible, wechatTokenStillValid, WECHAT_SCENE_MAX_BYTES } from "@/lib/trade/invite-rules";

describe("inviteScene", () => {
  test("uses lowercase email when it fits", () => {
    assert.equal(inviteScene(" Deji@Mill.COM ", "S-002"), "deji@mill.com");
  });

  test("falls back to supplier code when email is too long for WeChat", () => {
    const email = `${"a".repeat(70)}@mill.com`;
    assert.ok(Buffer.byteLength(email, "utf8") > WECHAT_SCENE_MAX_BYTES);
    assert.equal(inviteScene(email, "S-011"), "s-011");
  });
});

describe("supplierInviteEligible", () => {
  test("requires email", () => {
    const result = supplierInviteEligible({ email: "", code: "S-001", wechatOpenid: null, onboardingStatus: "to_invite" });
    assert.equal(result.ok, false);
  });

  test("skips mills already on WeChat", () => {
    const result = supplierInviteEligible({
      email: "mill@example.com",
      code: "S-001",
      wechatOpenid: "ovABC",
      onboardingStatus: "to_invite",
    });
    assert.equal(result.ok, false);
  });

  test("allows a first invite", () => {
    const result = supplierInviteEligible({
      email: "mill@example.com",
      code: "S-001",
      wechatOpenid: null,
      onboardingStatus: "to_invite",
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.scene, "mill@example.com");
  });
});

describe("wechatTokenStillValid", () => {
  test("reuses a token with more than five minutes left", () => {
    const expires = new Date(Date.now() + 30 * 60_000).toISOString();
    assert.equal(wechatTokenStillValid(expires), true);
  });

  test("refetches when expiry is close", () => {
    const expires = new Date(Date.now() + 60_000).toISOString();
    assert.equal(wechatTokenStillValid(expires), false);
  });
});
