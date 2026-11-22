import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONVERSATION_QUIET_MS, isAlertInbox, isLiveDeskStatus, isNewBuyerConversation } from "@/lib/trade/admin-alert-logic";

describe("isNewBuyerConversation", () => {
  it("pages the desk on the first inbound", () => {
    assert.equal(isNewBuyerConversation([{ direction: "in", createdAt: "2026-11-22T08:00:00.000Z" }]), true);
    assert.equal(isNewBuyerConversation([]), true);
  });

  it("does not page on a follow-up a few minutes later", () => {
    const now = Date.parse("2026-11-22T08:10:00.000Z");
    assert.equal(
      isNewBuyerConversation(
        [
          { direction: "in", createdAt: "2026-11-22T08:00:00.000Z" },
          { direction: "out", createdAt: "2026-11-22T08:01:00.000Z" },
          { direction: "in", createdAt: "2026-11-22T08:10:00.000Z" },
        ],
        now,
      ),
      false,
    );
  });

  it("pages again after a quiet gap", () => {
    const now = Date.parse("2026-11-22T14:00:00.000Z");
    assert.equal(
      isNewBuyerConversation(
        [
          { direction: "in", createdAt: "2026-11-21T09:00:00.000Z" },
          { direction: "in", createdAt: new Date(now - CONVERSATION_QUIET_MS - 1).toISOString() },
          { direction: "in", createdAt: new Date(now).toISOString() },
        ],
        now,
      ),
      true,
    );
  });
});

describe("isAlertInbox", () => {
  it("keeps Aquifert noreply and skips other noreply mailboxes", () => {
    assert.equal(isAlertInbox("noreply@aquifert.com"), true);
    assert.equal(isAlertInbox("kaytoba49@gmail.com"), true);
    assert.equal(isAlertInbox("noreply@gmail.com"), false);
  });
});

describe("isLiveDeskStatus", () => {
  it("skips conversation alerts while Matt already has the thread", () => {
    assert.equal(isLiveDeskStatus("indication_sent"), true);
    assert.equal(isLiveDeskStatus("collecting"), false);
    assert.equal(isLiveDeskStatus("rfq_sent"), false);
  });
});
