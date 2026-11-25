import assert from "node:assert/strict";
import test from "node:test";
import { isBillingOffer, offerAccess, offerForPrice, priceIdFor } from "./catalog";

test("AQ Analytics is the growth plan and each AQ Zero tier is enterprise", () => {
  assert.deepEqual(offerAccess("analytics"), { plan: "growth", tier: null });
  assert.deepEqual(offerAccess("sprout"), { plan: "enterprise", tier: "sprout" });
  assert.deepEqual(offerAccess("harvest"), { plan: "enterprise", tier: "harvest" });
  assert.deepEqual(offerAccess("scale"), { plan: "enterprise", tier: "scale" });
});

test("a Stripe price id maps back to the offer it was configured for", () => {
  const env = {
    STRIPE_PRICE_ANALYTICS: "price_analytics",
    STRIPE_PRICE_ZERO_SPROUT: "price_sprout",
    STRIPE_PRICE_ZERO_HARVEST: "price_harvest",
    STRIPE_PRICE_ZERO_SCALE: "price_scale",
  };
  assert.equal(priceIdFor("harvest", env), "price_harvest");
  assert.equal(offerForPrice("price_scale", env), "scale");
  assert.equal(offerForPrice("price_unknown", env), null);
  assert.equal(isBillingOffer("analytics"), true);
  assert.equal(isBillingOffer("core"), false);
});
