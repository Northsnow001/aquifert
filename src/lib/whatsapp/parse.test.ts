import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buyerInviteEligible, parseWhatsAppStart, toE164 } from "@/lib/whatsapp/parse";

describe("parseWhatsAppStart", () => {
  test("reads START plus email from the 1b wa.me prefill", () => {
    const parsed = parseWhatsAppStart("START kaytoba49@gmail.com");
    assert.equal(parsed.isStart, true);
    assert.equal(parsed.linkedEmail, "kaytoba49@gmail.com");
  });

  test("reads START email after a hello from the invite link", () => {
    const parsed = parseWhatsAppStart("Hi, this is Kayode from Nexora. START kaytoba49@gmail.com");
    assert.equal(parsed.isStart, true);
    assert.equal(parsed.linkedEmail, "kaytoba49@gmail.com");
  });

  test("ignores a plain hello", () => {
    const parsed = parseWhatsAppStart("Hello");
    assert.equal(parsed.isStart, false);
    assert.equal(parsed.linkedEmail, "");
  });
});

describe("toE164", () => {
  test("strips the whatsapp: prefix", () => {
    assert.equal(toE164("whatsapp:+447427829952"), "+447427829952");
  });
});

describe("buyerInviteEligible", () => {
  test("requires email", () => {
    assert.equal(buyerInviteEligible({ email: "", whatsappE164: null, onboardingStatus: "to_invite" }).ok, false);
  });

  test("still invites when a contact number is on file", () => {
    assert.equal(
      buyerInviteEligible({ email: "buyer@example.com", whatsappE164: "+447111", onboardingStatus: "to_invite" }).ok,
      true,
    );
  });

  test("skips buyers marked skipped", () => {
    assert.equal(
      buyerInviteEligible({ email: "buyer@example.com", whatsappE164: null, onboardingStatus: "skipped" }).ok,
      false,
    );
  });
});
