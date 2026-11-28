import assert from "node:assert/strict";
import test from "node:test";
import { briefMessage } from "./brief";

test("an email chain keeps the new sentence and drops the quoted thread", () => {
  const raw = "We need to talk on the phone for this On Thu, Nov 26, 2026 at 6:28 AM Deji wrote: >> Sent from Outlook for Android >> *From:* Matthew O'Leary";
  assert.equal(briefMessage(raw, "The desk sent an update."), "We need to talk on the phone for this");
});

test("a short desk note is left as it is", () => {
  assert.equal(briefMessage("Buyer replied on email. Matt has the thread.", "The desk sent an update."), "Buyer replied on email. Matt has the thread.");
});

test("a signature and address collapse to the fallback", () => {
  const raw = "execution email chain > *Matt O'Leary* >> Tel: +447401608015 >> 71-75 Shelton Street, London";
  assert.equal(briefMessage(raw, "The desk sent an update."), "The desk sent an update.");
});
