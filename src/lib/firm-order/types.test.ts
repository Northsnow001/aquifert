import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseFirmOrder } from "@/lib/firm-order/types";

describe("parseFirmOrder", () => {
  it("accepts negotiator payload", () => {
    const order = parseFirmOrder({
      status: "DRAFT_PENDING_CLEARANCE",
      product: "Granular Urea",
      form_grade: "46% N",
      packing: "50kg bags",
      quantity_mt: 20,
      tolerance_pct: 5,
      unit_price_usd: 420,
      currency: "USD",
      incoterm: "CFR",
      price_basis: "Lagos Apapa",
      buyer: { name: "Kayode", email: "a@b.com", phone: "234" },
      flags: ["Laycan > 90 days"],
      assumed: ["Tolerance ±5%"],
    });
    assert.ok(order);
    assert.equal(order.product, "Granular Urea");
    assert.equal(order.quantity_mt, 20);
    assert.equal(order.buyer.name, "Kayode");
  });

  it("unwraps firm_order wrapper", () => {
    const order = parseFirmOrder({ firm_order: { product: "DAP", quantity_mt: "100" } });
    assert.ok(order);
    assert.equal(order.product, "DAP");
    assert.equal(order.quantity_mt, 100);
  });

  it("rejects empty product", () => {
    assert.equal(parseFirmOrder({ product: "" }), null);
  });
});
